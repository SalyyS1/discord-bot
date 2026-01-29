# Database Conflicts and Race Conditions - Migration Guide

## Overview

This migration adds critical database improvements to prevent race conditions, ensure data consistency, and improve query performance.

## Schema Changes

### 1. New Indexes

**Member Model:**
- Added `@@index([discordId])` - Faster lookups by Discord ID

**ModLog Model:**
- Added `@@index([guildId, targetId])` - Query moderation actions by target user

**Giveaway Model:**
- Added `@@index([status, endsAt])` - Efficiently query active giveaways by end time

**Ticket Model:**
- Existing `@@index([guildId, number])` - Already present for unique ticket numbers per guild

### 2. Optimistic Locking

**GuildSettings Model:**
- Added `version Int @default(0)` field
- Prevents lost updates when multiple users modify settings simultaneously
- Use `updateGuildSettingsSafe()` helper for automatic retry logic

### 3. Cascade Fixes

**TempVoiceChannel Model:**
- Added `guild Guild @relation(...)` with `onDelete: Cascade`
- Added `@@index([guildId])` and `@@index([ownerId])`
- Prevents orphaned voice channel records when guild is deleted

**Guild Model:**
- Added `tempVoiceChannels TempVoiceChannel[]` relation

## New Middleware

### Tenant Isolation Middleware

**Location:** `packages/database/src/middleware/tenant-isolation-middleware.ts`

Auto-injects `guildId` filter into all queries to prevent cross-tenant data access.

**Usage:**
```typescript
import { createTenantIsolationMiddleware } from '@repo/database';

prisma.$use(createTenantIsolationMiddleware(guildId));
```

### Audit Log Middleware

**Location:** `packages/database/src/middleware/database-mutation-audit-logger.ts`

Automatically logs all database mutations with sensitive field redaction.

**Usage:**
```typescript
import { createAuditLogMiddleware } from '@repo/database';

prisma.$use(createAuditLogMiddleware({
  guildId: 'guild_123',
  userId: 'user_456',
  requestId: 'req_789',
  source: 'DASHBOARD',
  ipAddress: '127.0.0.1',
}));
```

## New Helper Functions

### Location: `apps/dashboard/src/lib/db/safe-transaction-helpers.ts`

**Race-safe operations:**

1. **getNextTicketNumber(prisma, guildId)** - Get next ticket number with locking
2. **createTicketWithNumber(prisma, data)** - Create ticket with auto-increment number
3. **addMemberXP(prisma, memberId, xpAmount)** - Add XP using atomic increment
4. **createGiveawayEntry(prisma, data)** - Prevent duplicate giveaway entries
5. **updateGuildSettingsSafe(prisma, guildId, updates, maxRetries)** - Update with optimistic locking

**Usage Example:**
```typescript
import { createTicketWithNumber } from '@/lib/db/safe-transaction-helpers';

const ticket = await createTicketWithNumber(prisma, {
  guildId: 'guild_123',
  memberId: 'member_456',
  channelId: 'channel_789',
  subject: 'Support Request',
});
```

## Cleanup Script

**Location:** `scripts/database-cleanup-orphan-records.js`

Identifies and removes orphaned records.

**Usage:**
```bash
# Dry run (show what would be deleted)
node scripts/database-cleanup-orphan-records.js --dry-run

# Clean up all guilds
node scripts/database-cleanup-orphan-records.js

# Clean up specific guild
node scripts/database-cleanup-orphan-records.js --guild-id=guild_123
```

## Migration Steps

### 1. Backup Database (CRITICAL)
```bash
pg_dump discord_bot > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Apply Migration
```bash
cd packages/database
npx prisma migrate dev --name fix-database-conflicts-and-race-conditions
```

### 3. Verify Migration
```bash
npx prisma validate
npx prisma generate
```

### 4. Run Cleanup (Optional)
```bash
# Check for orphans first
node scripts/database-cleanup-orphan-records.js --dry-run

# Clean up if needed
node scripts/database-cleanup-orphan-records.js
```

## Breaking Changes

None. All changes are backwards compatible.

## Performance Impact

**Positive:**
- Faster queries on Member, ModLog, Giveaway, TempVoiceChannel
- Reduced database contention with optimistic locking
- Prevented duplicate entries in concurrent scenarios

**Potential Issues:**
- Optimistic locking may retry transactions (max 3 times)
- Middleware adds minimal overhead (~1-5ms per query)

## Required Code Updates

### Replace Manual Ticket Creation

**Before:**
```typescript
const ticket = await prisma.ticket.create({
  data: { guildId, memberId, channelId, number: ??? }
});
```

**After:**
```typescript
import { createTicketWithNumber } from '@/lib/db/safe-transaction-helpers';

const ticket = await createTicketWithNumber(prisma, {
  guildId, memberId, channelId
});
```

### Replace Manual XP Updates

**Before:**
```typescript
const member = await prisma.member.findUnique({ where: { id } });
await prisma.member.update({
  where: { id },
  data: { xp: member.xp + amount }
});
```

**After:**
```typescript
import { addMemberXP } from '@/lib/db/safe-transaction-helpers';

await addMemberXP(prisma, memberId, amount);
```

### Replace Manual Settings Updates

**Before:**
```typescript
await prisma.guildSettings.update({
  where: { guildId },
  data: updates
});
```

**After:**
```typescript
import { updateGuildSettingsSafe } from '@/lib/db/safe-transaction-helpers';

await updateGuildSettingsSafe(prisma, guildId, updates);
```

## Testing Checklist

- [ ] Ticket creation under concurrent load (no duplicate numbers)
- [ ] XP gain during high message activity (correct totals)
- [ ] Multiple users editing settings simultaneously (no lost updates)
- [ ] Giveaway entries from same user (rejection)
- [ ] Guild deletion cascades to temp voice channels
- [ ] Middleware doesn't break existing queries
- [ ] Cleanup script identifies orphans correctly

## Rollback Plan

```bash
# Restore from backup
psql discord_bot < backup_YYYYMMDD_HHMMSS.sql

# Revert migration
cd packages/database
npx prisma migrate resolve --rolled-back fix-database-conflicts-and-race-conditions
```

## Support

If you encounter issues:
1. Check migration logs in `packages/database/prisma/migrations/`
2. Review Prisma query logs (set `log: ['query', 'error', 'warn']`)
3. Run cleanup script in dry-run mode
4. Restore from backup if critical
