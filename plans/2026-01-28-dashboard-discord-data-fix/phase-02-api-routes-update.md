# Phase 02: Update API Routes

**Effort:** 45min | **Priority:** HIGH | **Status:** Pending

## Overview

Update the channels and roles API routes to use dynamic tenant tokens instead of the hardcoded `DISCORD_TOKEN`.

## Requirements

- [ ] Update channels route to resolve guild token
- [ ] Update roles route to resolve guild token
- [ ] Add proper error handling for token issues
- [ ] Add caching headers for Discord responses

## Related Files

| File                                                            | Action                          |
| --------------------------------------------------------------- | ------------------------------- |
| `apps/dashboard/src/app/api/guilds/[guildId]/channels/route.ts` | Modify                          |
| `apps/dashboard/src/app/api/guilds/[guildId]/roles/route.ts`    | Modify                          |
| `apps/dashboard/src/lib/discord-oauth.ts`                       | Modify - update `getGuildRoles` |

## Implementation Steps

### Step 1: Update channels route

**File:** `apps/dashboard/src/app/api/guilds/[guildId]/channels/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { discordService, DiscordApiError } from '@/lib/discord';
import { getGuildBotToken } from '@/lib/tenant-token';
import { logger } from '@/lib/logger';

const CHANNEL_TYPE_MAP: Record<
  number,
  'text' | 'voice' | 'category' | 'announcement' | 'forum' | 'stage'
> = {
  0: 'text',
  2: 'voice',
  4: 'category',
  5: 'announcement',
  13: 'stage',
  15: 'forum',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    // Resolve the correct bot token for this guild
    const botToken = await getGuildBotToken(guildId);

    if (!botToken) {
      logger.warn(`No bot token available for guild ${guildId}`);
      return ApiResponse.error('Bot not configured for this guild', 503);
    }

    const rawChannels = await discordService.getGuildChannels(guildId, botToken);

    // Build category map for parent names
    const categoryMap = new Map<string, string>();
    rawChannels.forEach((c: { id: string; name: string; type: number }) => {
      if (c.type === 4) {
        categoryMap.set(c.id, c.name);
      }
    });

    // Transform channels
    const channels = rawChannels
      .filter((c: { type: number }) => CHANNEL_TYPE_MAP[c.type] !== undefined)
      .map((c: { id: string; name: string; type: number; parent_id?: string }) => ({
        id: c.id,
        name: c.name,
        type: CHANNEL_TYPE_MAP[c.type] || 'text',
        parentId: c.parent_id || null,
        parentName: c.parent_id ? categoryMap.get(c.parent_id) : undefined,
      }))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    return NextResponse.json(
      { success: true, data: channels },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    if (error instanceof DiscordApiError) {
      if (error.isForbidden()) {
        return ApiResponse.error('Bot does not have access to this guild', 403);
      }
      if (error.isRateLimited()) {
        return ApiResponse.error('Rate limited by Discord. Try again later.', 429);
      }
    }

    logger.error(`API_CHANNELS error for guild ${guildId}: ${error}`);
    return ApiResponse.serverError('Failed to fetch channels');
  }
}
```

### Step 2: Update roles route

**File:** `apps/dashboard/src/app/api/guilds/[guildId]/roles/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { discordService, DiscordApiError } from '@/lib/discord';
import { getGuildBotToken } from '@/lib/tenant-token';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    // Resolve the correct bot token for this guild
    const botToken = await getGuildBotToken(guildId);

    if (!botToken) {
      logger.warn(`No bot token available for guild ${guildId}`);
      return ApiResponse.error('Bot not configured for this guild', 503);
    }

    // Use discordService instead of getGuildRoles from discord-oauth
    const roles = await discordService.getGuildRoles(guildId, botToken);

    // Filter and transform roles
    const filteredRoles = roles
      .filter(
        (role: { name: string; managed: boolean }) => role.name !== '@everyone' && !role.managed
      )
      .sort((a: { position: number }, b: { position: number }) => b.position - a.position)
      .map((role: { id: string; name: string; color: number; position: number }) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
      }));

    return NextResponse.json(
      { success: true, data: filteredRoles },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    if (error instanceof DiscordApiError) {
      if (error.isForbidden()) {
        return ApiResponse.error('Bot does not have access to this guild', 403);
      }
      if (error.isRateLimited()) {
        return ApiResponse.error('Rate limited by Discord. Try again later.', 429);
      }
    }

    logger.error(`API_ROLES error for guild ${guildId}: ${error}`);
    return ApiResponse.serverError('Failed to fetch roles');
  }
}
```

### Step 3: Update discord-oauth.ts (optional cleanup)

The `getGuildRoles` function in `discord-oauth.ts` is now redundant since we use `discordService.getGuildRoles`. Either:

1. **Remove it** - if not used elsewhere
2. **Update it** - to accept dynamic token

```typescript
// Option 2: Update to accept token
export async function getGuildRoles(guildId: string, botToken?: string): Promise<DiscordRole[]> {
  const token = botToken || DISCORD_BOT_TOKEN;

  if (!token) {
    logger.error('[OAuth] No bot token configured');
    return [];
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${token}` },
    });

    if (!response.ok) {
      logger.error(`[OAuth] Failed to fetch roles for guild ${guildId}: ${response.status}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    logger.error(`[OAuth] Error fetching roles for guild ${guildId}`, { error: String(error) });
    return [];
  }
}
```

## Todo List

- [ ] Update channels route with token resolution
- [ ] Update roles route with token resolution
- [ ] Add `DiscordApiError` handling in both routes
- [ ] Add cache headers to responses
- [ ] Test with multi-tenant guilds
- [ ] Clean up or update `discord-oauth.ts`

## Success Criteria

- [ ] Channels load correctly for all user's guilds
- [ ] Roles load correctly for all user's guilds
- [ ] Proper error messages when bot lacks access
- [ ] 30s caching reduces Discord API calls

## Testing Scenarios

1. **Main bot guild** - Uses `DISCORD_TOKEN`, should work
2. **Tenant bot guild** - Uses tenant's decrypted token
3. **No bot access** - Returns 403 with clear message
4. **Rate limited** - Returns 429 with retry message

## Risk Assessment

| Risk                         | Likelihood | Impact | Mitigation                |
| ---------------------------- | ---------- | ------ | ------------------------- |
| Breaking change for main bot | Low        | High   | Fallback to DISCORD_TOKEN |
| Cache serves stale data      | Low        | Low    | 30s TTL is short enough   |
| Token resolution fails       | Low        | Medium | Graceful error handling   |
