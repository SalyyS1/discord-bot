# Phase 2: Fix 500 Server Errors

## Context

- [500 Analysis](../research/researcher-02-500-errors-analysis.md)
- [stats/route.ts](../../../apps/dashboard/src/app/api/guilds/[guildId]/stats/route.ts)
- [tenant-token.ts](../../../apps/dashboard/src/lib/tenant-token.ts)

## Overview

| Field    | Value         |
| -------- | ------------- |
| Date     | 2026-01-28    |
| Priority | P0 - Critical |
| Status   | Pending       |
| Effort   | 2h            |

**Problem**: Multiple causes of 500 errors:

1. 17 parallel DB queries in `/stats` with `Promise.all` - one fails = all fail
2. `getEncryptionService().decrypt()` throws without try-catch
3. No guildId format validation

**Solution**: Use Promise.allSettled, wrap encryption, add validation middleware.

## Key Insights

1. `Promise.all` fails fast - any rejection kills entire response
2. Encryption can throw on malformed data or missing ENCRYPTION_KEY
3. Invalid guildId causes Prisma errors deep in query execution

## Requirements

- [ ] Stats route uses `Promise.allSettled` for resilience
- [ ] Encryption wrapped in try-catch with fallback
- [ ] guildId validated as Discord snowflake (17-19 digits)
- [ ] Partial data returned when possible
- [ ] 400 for invalid guildId (not 500)

## Implementation Steps

### Step 2.1: Create guildId Validation Utility

**File**: `apps/dashboard/src/lib/validation.ts` (new file)

```typescript
/**
 * Validates Discord snowflake ID format
 * Snowflakes are 17-19 digit numbers
 */
export function isValidGuildId(guildId: string): boolean {
  return /^\d{17,19}$/.test(guildId);
}

/**
 * Validation helper for API routes
 * Returns error response if invalid, null if valid
 */
export function validateGuildId(guildId: string): Response | null {
  if (!isValidGuildId(guildId)) {
    return Response.json({ success: false, error: 'Invalid guild ID format' }, { status: 400 });
  }
  return null;
}
```

### Step 2.2: Fix tenant-token.ts Encryption

**File**: `apps/dashboard/src/lib/tenant-token.ts`

```typescript
// Replace lines 58-68
try {
  // Decrypt token
  const encryptionService = getEncryptionService();
  const decryptedToken = encryptionService.decrypt(tenant.discordToken);

  // Cache the result
  tokenCache.set(guildId, {
    token: decryptedToken,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return decryptedToken;
} catch (decryptError) {
  // VALIDATED DECISION: Option C - Fallback + log alert for admin
  logger.error(`[ADMIN ALERT] Token decryption failed for guild ${guildId}`, {
    error: String(decryptError),
    tenantId: guild.tenantId,
    severity: 'high',
    action: 'Investigate tenant token configuration',
  });

  // TODO: Consider sending admin notification (Slack/Discord webhook)
  // await notifyAdmin('token_decryption_failed', { guildId, tenantId: guild.tenantId });

  // Fallback to default token on decryption failure
  return process.env.DISCORD_TOKEN || null;
}
```

### Step 2.3: Refactor stats/route.ts with Promise.allSettled

**File**: `apps/dashboard/src/app/api/guilds/[guildId]/stats/route.ts`

```typescript
// Add import at top
import { validateGuildId } from '@/lib/validation';

// Update GET handler (replace lines 16-100)
export async function GET(request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  // Validate guildId format
  const validationError = validateGuildId(guildId);
  if (validationError) return validationError;

  try {
    // Fetch Discord data and DB data in parallel with resilience
    const [discordResult, dbResult] = await Promise.allSettled([
      fetchDiscordGuildData(guildId),
      fetchDatabaseStats(guildId),
    ]);

    // Handle DB failure (critical)
    if (dbResult.status === 'rejected') {
      logger.error(`Database query failed for guild ${guildId}`, {
        error: String(dbResult.reason)
      });
      return NextResponse.json(
        { success: false, error: 'Database temporarily unavailable' },
        { status: 503 }
      );
    }

    const dbStats = dbResult.value;
    if (!dbStats.guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    // Discord data is optional - gracefully degrade
    const discordData = discordResult.status === 'fulfilled' ? discordResult.value : null;
    if (discordResult.status === 'rejected') {
      logger.warn(`Discord API failed for guild ${guildId}, using DB-only data`);
    }

    // ... rest of response building (unchanged)
```

### Step 2.4: Make fetchDatabaseStats Resilient

**File**: `apps/dashboard/src/app/api/guilds/[guildId]/stats/route.ts`

```typescript
// Replace fetchDatabaseStats function (lines 129-223)
async function fetchDatabaseStats(guildId: string) {
  // Split into critical and optional queries
  const criticalQueries = Promise.all([
    prisma.guild.findUnique({
      where: { id: guildId },
      include: { settings: true },
    }),
    prisma.member.count({ where: { guildId } }),
  ]);

  // Optional queries - use allSettled so failures don't break response
  const optionalResults = await Promise.allSettled([
    prisma.ticket.count({ where: { guildId } }),
    prisma.ticket.count({ where: { guildId, status: 'OPEN' } }),
    prisma.giveaway.count({ where: { guildId } }),
    prisma.giveaway.count({ where: { guildId, status: 'ACTIVE' } }),
    prisma.warning.count({ where: { guildId } }),
    prisma.autoResponder.count({ where: { guildId } }),
    prisma.levelRole.count({ where: { guildId } }),
    prisma.member.aggregate({
      where: { guildId },
      _sum: { totalMessages: true },
    }),
    prisma.member.findMany({
      where: { guildId },
      orderBy: { xp: 'desc' },
      take: 10,
      select: { discordId: true, xp: true, level: true },
    }),
    prisma.modLog.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, action: true, reason: true, createdAt: true },
    }),
    prisma.member.aggregate({ where: { guildId }, _sum: { xp: true } }),
    prisma.member.aggregate({ where: { guildId }, _avg: { level: true } }),
    prisma.member.aggregate({ where: { guildId }, _max: { level: true } }),
    prisma.member.count({
      where: {
        guildId,
        lastXpGain: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.member.groupBy({
      by: ['level'],
      where: { guildId },
      _count: { level: true },
      orderBy: { level: 'desc' },
      take: 10,
    }),
  ]);

  // Extract values with defaults for failed queries
  const getValue = <T>(result: PromiseSettledResult<T>, fallback: T): T =>
    result.status === 'fulfilled' ? result.value : fallback;

  const [guild, memberCount] = await criticalQueries;

  return {
    guild,
    memberCount,
    ticketCount: getValue(optionalResults[0], 0),
    openTickets: getValue(optionalResults[1], 0),
    giveawayCount: getValue(optionalResults[2], 0),
    activeGiveaways: getValue(optionalResults[3], 0),
    warningCount: getValue(optionalResults[4], 0),
    autoresponderCount: getValue(optionalResults[5], 0),
    levelRoleCount: getValue(optionalResults[6], 0),
    messageStats: getValue(optionalResults[7], { _sum: { totalMessages: 0 } }),
    topMembers: getValue(optionalResults[8], []),
    recentActivity: getValue(optionalResults[9], []),
    totalXp: getValue(optionalResults[10], { _sum: { xp: 0 } }),
    avgLevel: getValue(optionalResults[11], { _avg: { level: 0 } }),
    topLevel: getValue(optionalResults[12], { _max: { level: 0 } }),
    todayActivity: getValue(optionalResults[13], 0),
    levelStats: getValue(optionalResults[14], []),
  };
}
```

### Step 2.5: Add Validation to Other Routes

Add to each route handler before any DB calls:

```typescript
import { validateGuildId } from '@/lib/validation';

export async function GET(request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  // Add at start
  const validationError = validateGuildId(guildId);
  if (validationError) return validationError;

  // ... rest of handler
```

**Routes to update**:

- `/leveling/route.ts`
- `/roles/route.ts`
- `/channels/route.ts`
- `/voice/route.ts`
- `/settings/route.ts`
- `/moderation/route.ts`
- `/messages/route.ts`
- All other guild routes

## Success Criteria

- [ ] Invalid guildId returns 400 with clear message
- [ ] Stats route works even if some DB queries fail
- [ ] Encryption failures don't crash routes
- [ ] Discord API down → partial data returned
- [ ] No 500 errors in console for common failure scenarios

## Risk Assessment

| Risk                               | Mitigation                                        |
| ---------------------------------- | ------------------------------------------------- |
| Performance impact from allSettled | Minimal - just wraps promises                     |
| Hiding real errors                 | Log all failures, just don't crash                |
| Fallback to DISCORD_TOKEN security | Only for decryption failures, not missing tenants |

## Testing

```bash
# Test invalid guildId
curl /api/guilds/invalid-id/stats
# Should return 400 "Invalid guild ID format"

# Test partial failure resilience
# Temporarily break one DB query, stats should still load

# Test encryption failure
# Set ENCRYPTION_KEY wrong, should fallback to DISCORD_TOKEN
```
