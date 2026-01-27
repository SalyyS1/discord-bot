# Scout Report: Dashboard Pages Discord Data Handling

## Summary
Dashboard feature pages use **real Discord data** fetched via API routes that call Discord's API. No hardcoded fake data for channel/role selectors.

---

## 1. Channel/Role Selector Components

### ChannelSelector (`components/selectors/channel-selector.tsx`)
- **Data Source**: Fetches from `/api/guilds/${guildId}/channels`
- **API Route**: Calls `discordService.getGuildChannels(guildId)` - real Discord API
- **Format**: `{ id, name, type, parentId, parentName }`
- **Features**: Search, grouped by category, type filtering

### RoleSelector (`components/selectors/role-selector.tsx`)
- **Data Source**: Fetches from `/api/guilds/${guildId}/roles`
- **API Route**: Calls `getGuildRoles(guildId)` from discord-oauth lib - real Discord API
- **Format**: `{ id, name, color, position }`
- **Features**: Search, color display, position sorting, multi-select support

---

## 2. Feature Pages Using Selectors

### Music Page (`dashboard/music/page.tsx`)
```tsx
<RoleSelector guildId={selectedGuildId} value={settings.djRoleId} />
<ChannelSelector guildId={selectedGuildId} types={['text']} value={settings.requestChannelId} />
```
- Uses `useGuildContext()` for selected guild
- Fetches settings from `/api/guilds/${guildId}/music`

### Voice Page (`dashboard/voice/page.tsx`)
```tsx
<ChannelSelector guildId={selectedGuildId} types={['voice']} value={settings.tempVoiceCreatorId} />
<ChannelSelector guildId={selectedGuildId} types={['category']} value={settings.tempVoiceCategoryId} />
```
- Same pattern - passes guildId, selectors auto-fetch

---

## 3. Main Dashboard Stats Page (`dashboard/page.tsx`)

### Data Flow
- Uses `useSelectedGuild()` hook for guild context
- Fetches from `/api/guilds/${guildId}/stats`
- **NO channel/role selectors** on this page (just stats display)

### Fake/Placeholder Data Found
```tsx
// Line 177-182: Mock chart data if API returns empty
const displayChartData = chartData.length > 0 ? chartData : Array.from({ length: 7 }).map((_, i) => ({
    date: new Date(...).toLocaleDateString(),
    members: (stats?.stats.members || 100) + i * 5,
    messages: (stats?.stats.messages || 500) + i * 50,
}));
```

---

## 4. Stats API Route (`api/guilds/[guildId]/stats/route.ts`)

### Real Database Queries (Prisma)
- Member count, tickets, giveaways, warnings
- Autoresponders, level roles, messages
- Top members leaderboard, level distribution
- Recent moderation logs

### No Discord API Calls
- Stats are from **database only** (guild.settings, members table)
- Does NOT fetch live Discord data (channels, roles, online members)

---

## 5. Key Findings

| Component | Data Source | Real/Fake |
|-----------|-------------|-----------|
| ChannelSelector | Discord API via `/api/guilds/:id/channels` | **Real** |
| RoleSelector | Discord API via `/api/guilds/:id/roles` | **Real** |
| Dashboard stats | Prisma DB queries | **Real DB** |
| Growth chart | API with fallback to mock data | **Mixed** |

### Patterns Observed
1. **Selector auto-fetch**: Pass `guildId` prop → component fetches data internally
2. **Loading states**: Both selectors show `<Loader2>` spinner while fetching
3. **Guild context**: `useGuildContext()` or `useSelectedGuild()` for selected guild
4. **API consistency**: All APIs return `{ success: true, data: ... }` format

---

## 6. No Hardcoded Channel/Role Data

Both selector components:
- Start with empty `fetchedChannels/fetchedRoles` state
- Fetch on mount when `guildId` changes
- Handle empty/loading states gracefully
- No fake/demo data fallbacks

---

## Files Analyzed
- `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/music/page.tsx`
- `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/voice/page.tsx`
- `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/page.tsx`
- `apps/dashboard/src/app/api/guilds/[guildId]/stats/route.ts`
- `apps/dashboard/src/app/api/guilds/[guildId]/channels/route.ts`
- `apps/dashboard/src/app/api/guilds/[guildId]/roles/route.ts`
- `apps/dashboard/src/components/selectors/channel-selector.tsx`
- `apps/dashboard/src/components/selectors/role-selector.tsx`
