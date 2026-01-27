# API 403 Forbidden Errors Analysis

**Date:** 2026-01-28  
**Endpoints:** `/api/guilds/{guildId}/roles`, `/channels`, `/leveling`

## Root Cause Analysis

**Primary Issue: Silent Token Failure + Production Guard**

The 403 errors stem from a cascade of silent failures in the OAuth token flow:

```
Token expired/missing → getValidAccessToken returns null → getUserDiscordGuilds returns []
→ validateGuildAccess sees empty array → Production returns 403
```

### Code Flow Breakdown

1. **`validateGuildAccess`** (`session.ts:69-105`)
   - Calls `getUserDiscordGuilds(session.user.id)` (line 87)
   - If `userGuilds.length === 0` AND `NODE_ENV === 'production'` → returns 403 (lines 100-102)
   - Error message: "Please link your Discord account to manage guilds"

2. **`getUserDiscordGuilds`** (`discord-oauth.ts:160-185`)
   - Gets token via `getValidAccessToken(userId)` (line 161)
   - **If no token → returns `[]`** (line 164) - SILENT FAILURE
   - **If Discord API fails (401/any error) → returns `[]`** (lines 172-177) - SILENT FAILURE

3. **`getValidAccessToken`** (`discord-oauth.ts:31-70`)
   - Queries `account` table for Discord provider (line 39-47)
   - If no `accessToken` → returns `null` (lines 49-51)
   - If token needs refresh but fails → returns `null` (line 152)

### Specific Failure Scenarios

| Scenario                              | Result            | User Sees |
| ------------------------------------- | ----------------- | --------- |
| Token expired + refresh token invalid | `userGuilds = []` | 403       |
| User never completed OAuth properly   | No account record | 403       |
| Discord API 401 (token revoked)       | `userGuilds = []` | 403       |
| `accessToken` null in DB              | `token = null`    | 403       |

## OAuth Scopes

**Scopes are correct** (`auth.ts:38`): `['identify', 'email', 'guilds']`  
The `guilds` scope is required and present.

## Token Refresh Logic

**Refresh mechanism exists** (`discord-oauth.ts:93-154`) but has issues:

- On `invalid_grant` error: clears tokens, returns null (lines 117-128)
- On any other error: throws, caught by outer try, returns null (lines 150-153)
- No retry mechanism for transient failures

## Problematic Patterns

### 1. Silent Failure (Critical)

```typescript
// discord-oauth.ts:163-164
if (!token) {
  return []; // Should throw or return error type
}
```

### 2. Ambiguous Empty Array

Cannot distinguish between:

- User has no guilds (legitimate)
- Token invalid (error)
- Network failure (error)

### 3. No Error Propagation

`validateGuildAccess` cannot tell WHY guilds are empty, so it guesses "Discord not linked"

## Recommended Fixes

### Fix 1: Add Error Type to Guild Fetch Result

```typescript
// discord-oauth.ts
type GuildFetchResult =
  | { success: true; guilds: DiscordGuild[] }
  | { success: false; error: 'no_token' | 'token_expired' | 'api_error' | 'refresh_failed' };

export async function getUserDiscordGuilds(userId: string): Promise<GuildFetchResult> {
  const token = await getValidAccessToken(userId);
  if (!token) {
    return { success: false, error: 'no_token' };
  }
  // ... rest with proper error types
}
```

### Fix 2: Update validateGuildAccess

```typescript
// session.ts
const guildResult = await getUserDiscordGuilds(session.user.id);

if (!guildResult.success) {
  if (guildResult.error === 'no_token' || guildResult.error === 'token_expired') {
    return ApiResponse.error('Session expired. Please re-authenticate with Discord.', 401);
  }
  return ApiResponse.error('Failed to verify guild access. Please try again.', 503);
}

if (guildResult.guilds.length === 0) {
  // User genuinely has no guilds - this is now unambiguous
}
```

### Fix 3: Add Token Validation Endpoint

Create `/api/auth/validate-token` that proactively checks token validity and triggers re-auth if needed.

### Fix 4: Better Logging

Add structured logging in `getUserDiscordGuilds` with user ID and failure reason for debugging.

## Quick Diagnostic Query

```sql
-- Check if user has valid Discord account record
SELECT u.id, u.email, a."accessToken" IS NOT NULL as has_token,
       a."refreshToken" IS NOT NULL as has_refresh,
       a."accessTokenExpiresAt" < NOW() as token_expired
FROM "User" u
LEFT JOIN "Account" a ON u.id = a."userId" AND a."providerId" = 'discord'
WHERE u.id = '<affected_user_id>';
```

## File Locations

| File                                      | Lines   | Issue                               |
| ----------------------------------------- | ------- | ----------------------------------- |
| `apps/dashboard/src/lib/session.ts`       | 86-102  | Empty array treated as "not linked" |
| `apps/dashboard/src/lib/discord-oauth.ts` | 160-185 | Silent failure returns []           |
| `apps/dashboard/src/lib/discord-oauth.ts` | 49-51   | Null token not propagated           |
| `apps/dashboard/src/lib/auth.ts`          | 38      | OAuth scopes (correct)              |

## Unresolved Questions

1. Is Better Auth storing tokens correctly on initial OAuth? (Need to check account table schema)
2. Are there race conditions in multi-tab scenarios causing token corruption?
3. Is the `accessTokenExpiresAt` being set correctly on initial auth (not just refresh)?
4. Should we add automatic re-auth redirect on 403 in the frontend?
