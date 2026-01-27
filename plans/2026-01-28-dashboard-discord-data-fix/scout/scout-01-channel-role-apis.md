# Scout Report: Dashboard Channel/Role Fetching Implementation

## Summary

The dashboard uses a clean architecture with API routes + React Query hooks for fetching Discord channel/role data.

---

## API Routes

### Channels API: `/api/guilds/[guildId]/channels/route.ts`
**File:** `apps/dashboard/src/app/api/guilds/[guildId]/channels/route.ts`

- Uses `discordService.getGuildChannels()` from `@/lib/discord`
- Bot token authentication via `DISCORD_TOKEN` env var
- Maps Discord channel types (0=text, 2=voice, 4=category, 5=announcement, 13=stage, 15=forum)
- Builds category map for parent names
- Returns: `{ id, name, type, parentId, parentName }`

### Roles API: `/api/guilds/[guildId]/roles/route.ts`
**File:** `apps/dashboard/src/app/api/guilds/[guildId]/roles/route.ts`

- Uses `getGuildRoles()` from `@/lib/discord-oauth`
- Bot token authentication via `DISCORD_TOKEN` env var
- Filters out `@everyone` and managed roles
- Sorts by position (descending)
- Returns: `{ id, name, color, position }`

---

## Discord API Services

### `@/lib/discord.ts`
```typescript
const discordService = {
  getGuildChannels: (guildId) => fetchDiscord(`/guilds/${guildId}/channels`),
  getGuildRoles: (guildId) => fetchDiscord(`/guilds/${guildId}/roles`),
};
```
- Uses Bot token (`Authorization: Bot ${BOT_TOKEN}`)
- Calls Discord API v10

### `@/lib/discord-oauth.ts` (getGuildRoles)
```typescript
export async function getGuildRoles(guildId: string): Promise<DiscordRole[]>
```
- Duplicate implementation also using Bot token
- Returns empty array on failure (graceful degradation)

---

## React Query Hooks

### `use-guild-channels.ts`
```typescript
export function useGuildChannels(guildId: string | null) {
  return useQuery({
    queryKey: queryKeys.guildChannels(guildId),
    queryFn: () => fetchGuildChannels(guildId!),
    enabled: !!guildId,
    staleTime: 60_000, // 1 minute
  });
}
```
- Fetches `/api/guilds/${guildId}/channels`
- Parses response: `json.data || json.channels || []`

### `use-guild-roles.ts`
```typescript
export function useGuildRoles(guildId: string | null) {
  return useQuery({
    queryKey: queryKeys.guildRoles(guildId),
    queryFn: () => fetchGuildRoles(guildId!),
    enabled: !!guildId,
    staleTime: 5 * 60_000, // 5 minutes
  });
}

export function useAssignableRoles(guildId: string | null)
```
- Fetches `/api/guilds/${guildId}/roles`
- Parses response: `json.data || json.roles || []`
- `useAssignableRoles` filters managed roles client-side

---

## Guild Context

**Status:** No dedicated GuildContext found in `apps/dashboard/src/contexts/`

Guild ID is likely passed via:
- URL params (`/guilds/[guildId]/...`)
- React Query with guildId as dependency

---

## Key Observations

1. **Two Discord API clients exist:**
   - `discordService` in `lib/discord.ts`
   - `getGuildRoles` in `lib/discord-oauth.ts`
   - Roles API uses discord-oauth, Channels API uses discord.ts

2. **Auth validation:** Both routes use `validateGuildAccess(guildId)` from `@/lib/session`

3. **Caching strategy:** React Query with staleTime (1min channels, 5min roles)

4. **Response format:** Both return `ApiResponse.success(data)` wrapper

---

## File Locations

| Component | Path |
|-----------|------|
| Channels API | `apps/dashboard/src/app/api/guilds/[guildId]/channels/route.ts` |
| Roles API | `apps/dashboard/src/app/api/guilds/[guildId]/roles/route.ts` |
| Discord Service | `apps/dashboard/src/lib/discord.ts` |
| Discord OAuth | `apps/dashboard/src/lib/discord-oauth.ts` |
| useGuildChannels | `apps/dashboard/src/hooks/use-guild-channels.ts` |
| useGuildRoles | `apps/dashboard/src/hooks/use-guild-roles.ts` |
