# Phase 01: Token Resolution Layer

**Effort:** 1h | **Priority:** HIGH | **Status:** Complete ✅
**Completed:** 2026-01-28T12:00:00Z

## Changed Files

- `packages/database/prisma/schema.prisma` - Added `tenantId` to Guild model
- `apps/dashboard/src/lib/tenant-token.ts` - New file: token resolution logic with caching
- `apps/dashboard/src/lib/discord.ts` - Updated with dynamic token support

## Code Review (2026-01-28)

**Score:** 8.5/10 | **Reviewer:** Antigravity

- ✅ No critical issues
- ✅ Token security verified (no leakage)
- ✅ Caching with 5min TTL implemented
- ✅ Graceful fallback to DISCORD_TOKEN
- ⚠️ Minor: Consider LRU cache for scale

## Overview

Create a centralized token resolution system that:

1. Maps guildId to the correct tenant's bot token
2. Handles token decryption securely
3. Provides fallback to default `DISCORD_TOKEN`
4. Caches resolved tokens to minimize DB lookups

## Requirements

- [x] Create `getGuildBotToken(guildId)` function
- [x] Look up Guild → Tenant → decrypt botToken
- [x] Implement token caching (5 min TTL)
- [x] Update `discordService` to accept dynamic token
- [x] Handle missing tenant gracefully (fallback)

## Related Files

| File                                     | Action                             |
| ---------------------------------------- | ---------------------------------- |
| `apps/dashboard/src/lib/discord.ts`      | Modify - add dynamic token support |
| `apps/dashboard/src/lib/tenant-token.ts` | Create - token resolution logic    |
| `packages/database/prisma/schema.prisma` | Check - Guild→Tenant relation      |

## Architecture Decision

**Problem:** Schema shows `Tenant` model but `Guild` has no `tenantId` field.

**Options:**

1. Add `tenantId` to Guild model (schema change, migration)
2. Store guild→tenant mapping in separate table
3. Query tenant by checking which tenant's bot is in the guild

**Recommendation:** Option 1 - Add `tenantId` to Guild. Cleanest solution.

## Implementation Steps

### Step 1: Check for encryption utilities

```bash
# Find existing encryption utilities
grep -r "decrypt" apps/dashboard/src/lib/
grep -r "AES" packages/
```

### Step 2: Create tenant token resolver

**File:** `apps/dashboard/src/lib/tenant-token.ts`

```typescript
import { prisma } from '@repo/database';
import { decrypt } from './encryption'; // or create if missing
import { logger } from './logger';

// In-memory cache for decrypted tokens
const tokenCache = new Map<string, { token: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the bot token for a specific guild
 * Looks up tenant, decrypts token, caches result
 */
export async function getGuildBotToken(guildId: string): Promise<string | null> {
  // Check cache first
  const cached = tokenCache.get(guildId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  try {
    // Look up guild's tenant
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { tenantId: true }, // Requires schema update
    });

    if (!guild?.tenantId) {
      // No tenant - use default token
      return process.env.DISCORD_TOKEN || null;
    }

    // Get tenant's encrypted token
    const tenant = await prisma.tenant.findUnique({
      where: { id: guild.tenantId },
      select: { discordToken: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      logger.warn(`Tenant not active for guild ${guildId}`);
      return process.env.DISCORD_TOKEN || null;
    }

    // Decrypt token
    const decryptedToken = decrypt(tenant.discordToken);

    // Cache the result
    tokenCache.set(guildId, {
      token: decryptedToken,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return decryptedToken;
  } catch (error) {
    logger.error(`Failed to resolve token for guild ${guildId}: ${error}`);
    // Fallback to default token
    return process.env.DISCORD_TOKEN || null;
  }
}

/**
 * Clear cached token for a guild
 * Call when tenant token changes
 */
export function invalidateTokenCache(guildId: string): void {
  tokenCache.delete(guildId);
}
```

### Step 3: Update discord.ts to support dynamic tokens

**File:** `apps/dashboard/src/lib/discord.ts`

```typescript
const DISCORD_API_URL = 'https://discord.com/api/v10';
const DEFAULT_BOT_TOKEN = process.env.DISCORD_TOKEN;

/**
 * Fetch data from Discord API using provided or default Bot Token
 */
async function fetchDiscord(endpoint: string, options: RequestInit & { botToken?: string } = {}) {
  const token = options.botToken || DEFAULT_BOT_TOKEN;

  if (!token) {
    throw new Error('No bot token available');
  }

  const { botToken: _, ...fetchOptions } = options;

  const res = await fetch(`${DISCORD_API_URL}${endpoint}`, {
    ...fetchOptions,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    next: { revalidate: 30 }, // 30s cache
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new DiscordApiError(res.status, errorBody);
  }

  return res.json();
}

// Custom error class for better handling
export class DiscordApiError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`Discord API ${status}: ${body}`);
    this.name = 'DiscordApiError';
  }

  isRateLimited() {
    return this.status === 429;
  }
  isNotFound() {
    return this.status === 404;
  }
  isForbidden() {
    return this.status === 403;
  }
}

export const discordService = {
  getGuildChannels: async (guildId: string, botToken?: string) => {
    return fetchDiscord(`/guilds/${guildId}/channels`, { botToken });
  },
  getGuildRoles: async (guildId: string, botToken?: string) => {
    return fetchDiscord(`/guilds/${guildId}/roles`, { botToken });
  },
  getGuild: async (guildId: string, botToken?: string) => {
    return fetchDiscord(`/guilds/${guildId}?with_counts=true`, { botToken });
  },
};
```

### Step 4: Schema update (if needed)

**File:** `packages/database/prisma/schema.prisma`

Add to Guild model:

```prisma
model Guild {
  id        String   @id
  name      String
  joinedAt  DateTime @default(now())
  leftAt    DateTime?

  // Add tenant relation
  tenantId  String?
  // ... rest of fields
}
```

Then run migration:

```bash
pnpm db:migrate --name add_tenant_to_guild
```

## Todo List

- [x] Check if encryption utilities exist in codebase
- [x] Add `tenantId` to Guild schema if missing
- [x] Create `lib/tenant-token.ts`
- [x] Update `lib/discord.ts` with dynamic token support
- [x] Add `DiscordApiError` class
- [x] Add `getGuild` method for member count

## Success Criteria

- [x] `getGuildBotToken()` returns correct token for each guild
- [x] Tokens are cached for 5 minutes
- [x] Fallback to `DISCORD_TOKEN` works
- [x] No token exposure in error messages

## Risk Assessment

| Risk                                  | Likelihood | Impact | Mitigation                    |
| ------------------------------------- | ---------- | ------ | ----------------------------- |
| Schema migration breaks existing data | Low        | High   | Test in dev first, backup DB  |
| Token decryption slow                 | Low        | Medium | Caching reduces frequency     |
| Cache stale after token update        | Medium     | Low    | Provide invalidation function |

## Notes

- Check if there's already a Guild→Tenant relationship we're missing
- Encryption key must be in env vars (`TENANT_ENCRYPTION_KEY`)
- Consider using Redis for cache in production

## Next Steps

1. Proceed to Phase 02: Update API Routes to use `getGuildBotToken()`
2. Create database migration for `tenantId` field (if not already applied)
3. Consider adding Prisma relation `tenant Tenant?` for referential integrity (optional)
