# Phase 1: Fix 403 Token Cascade

## Context

- [403 Analysis](../research/researcher-01-api-403-analysis.md)
- [discord-oauth.ts](../../../apps/dashboard/src/lib/discord-oauth.ts)
- [session.ts](../../../apps/dashboard/src/lib/session.ts)

## Overview

| Field    | Value         |
| -------- | ------------- |
| Date     | 2026-01-28    |
| Priority | P0 - Critical |
| Status   | Pending       |
| Effort   | 2h            |

**Problem**: `getUserDiscordGuilds()` returns empty array `[]` on ANY failure (no token, expired token, API error). `validateGuildAccess()` interprets this as "Discord not linked" → 403.

**Solution**: Return discriminated union with error reason, update session validation to return 401 for token issues.

## Key Insights

1. Token failures silently become empty arrays
2. Cannot distinguish "user has no guilds" from "token error"
3. 403 is incorrect - should be 401 for auth issues, 503 for API issues

## Requirements

- [ ] `getUserDiscordGuilds` returns error reason, not just empty array
- [ ] `validateGuildAccess` returns 401 for token/refresh failures
- [ ] 403 only for actual permission denied (user lacks MANAGE_GUILD)
- [ ] 503 for Discord API unavailable
- [ ] Preserve backward compatibility for other callers

## Implementation Steps

### Step 1.1: Add GuildFetchResult Type

**File**: `apps/dashboard/src/lib/discord-oauth.ts`

```typescript
// Add after DiscordGuild interface (line ~193)
export type GuildFetchError =
  | 'no_token' // No token in database
  | 'token_expired' // Refresh failed
  | 'token_revoked' // Discord 401
  | 'api_error' // Discord API error
  | 'network_error'; // Network failure

export type GuildFetchResult =
  | { success: true; guilds: DiscordGuild[] }
  | { success: false; error: GuildFetchError };
```

### Step 1.2: Update getUserDiscordGuilds

**File**: `apps/dashboard/src/lib/discord-oauth.ts`

```typescript
// Replace lines 160-185
export async function getUserDiscordGuilds(userId: string): Promise<GuildFetchResult> {
  const token = await getValidAccessToken(userId);

  if (!token) {
    return { success: false, error: 'no_token' };
  }

  try {
    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        logger.warn(`[OAuth] Token unauthorized for user ${userId}`);
        return { success: false, error: 'token_revoked' };
      }
      logger.error(`[OAuth] Discord API error: ${response.status}`);
      return { success: false, error: 'api_error' };
    }

    const guilds = await response.json();
    return { success: true, guilds };
  } catch (error) {
    logger.error(`[OAuth] Network error for user ${userId}`, { error: String(error) });
    return { success: false, error: 'network_error' };
  }
}

// Add legacy wrapper for backward compatibility
export async function getUserDiscordGuildsLegacy(userId: string): Promise<DiscordGuild[]> {
  const result = await getUserDiscordGuilds(userId);
  return result.success ? result.guilds : [];
}
```

### Step 1.3: Update validateGuildAccess

**File**: `apps/dashboard/src/lib/session.ts`

```typescript
// Replace lines 86-102
const guildResult = await getUserDiscordGuilds(session.user.id);

if (!guildResult.success) {
  // Token issues → 401 (re-authenticate)
  if (guildResult.error === 'no_token' || guildResult.error === 'token_expired') {
    return ApiResponse.error('Session expired. Please sign in again.', 401);
  }
  // Discord revoked token → 401
  if (guildResult.error === 'token_revoked') {
    return ApiResponse.error('Discord access revoked. Please re-link your account.', 401);
  }
  // API/network error → 503 (retry later)
  return ApiResponse.error('Unable to verify guild access. Please try again.', 503);
}

// If user has Discord OAuth linked, verify permission
if (guildResult.guilds.length > 0) {
  const userGuild = guildResult.guilds.find((g) => g.id === guildId);

  // Check if user has MANAGE_GUILD permission
  if (!userGuild || (BigInt(userGuild.permissions) & MANAGE_GUILD_PERMISSION) === BigInt(0)) {
    return ApiResponse.forbidden('You do not have permission to manage this guild');
  }
}
// User has 0 guilds - allow in dev, block in prod
else if (process.env.NODE_ENV === 'production') {
  return ApiResponse.forbidden('You are not a member of any Discord servers');
}
```

### Step 1.4: Update Import

**File**: `apps/dashboard/src/lib/session.ts`

```typescript
// Update line 63
import { getUserDiscordGuilds, type GuildFetchResult } from './discord-oauth';
```

## Success Criteria

- [ ] Token expired returns 401, not 403
- [ ] Discord API down returns 503, not 403
- [ ] Permission denied still returns 403
- [ ] Frontend can distinguish auth issues from permission issues
- [ ] Logs show specific error type for debugging

## Risk Assessment

| Risk                        | Mitigation                                 |
| --------------------------- | ------------------------------------------ |
| Breaking change for callers | Added `getUserDiscordGuildsLegacy` wrapper |
| Users seeing more errors    | Better error messages guide users to fix   |
| 503 from Discord            | Consider caching guild list short-term     |

## Testing

```bash
# Test token expiry flow
1. Clear account.accessToken in DB
2. Access /dashboard/guild/123/leveling
3. Should see 401 + "Session expired" message

# Test permission denied
1. Access guild where user lacks MANAGE_GUILD
2. Should see 403 + "do not have permission"
```
