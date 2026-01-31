# Research: Select Component Patterns

**Date:** 2026-01-31

## Current Implementation

### ChannelSelector
- Fetches channels via `useEffect` when `guildId` prop provided
- Accepts `channels` prop directly as alternative
- Filters by `types`, groups by category
- Uses `@/components/ui/select` base

### RoleSelector
- Same pattern: `guildId` triggers fetch, or accepts `roles` prop
- Supports single/multiple selection
- Filters @everyone and managed roles
- `useGuildRoles` and `useAssignableRoles` hooks exist

### GuildContext
- Manages `selectedGuildId` only
- Persists to localStorage
- Does NOT provide channels/roles data

## Issues Identified
1. Duplicate fetching when multiple selectors on same page
2. Inconsistent prop passing (some pages pass guildId, some pass data, some neither)
3. No CategorySelector component exists
4. No centralized data provider for channels/roles

## Recommended Approach
1. Create `GuildDataProvider` that wraps dashboard pages
2. Use existing `useGuildChannels()` and `useGuildRoles()` from TanStack Query
3. Provide channels/roles via context to all selectors
4. Selectors consume context, fallback to props for flexibility

## Files to Modify
- `apps/dashboard/src/context/guild-context.tsx` - extend or create new provider
- `apps/dashboard/src/components/selectors/channel-selector.tsx` - consume context
- `apps/dashboard/src/components/selectors/role-selector.tsx` - consume context
- Create `apps/dashboard/src/components/selectors/category-selector.tsx`

## Unresolved
- Exact usage patterns in pages (glob timeout)
- Whether to extend GuildContext or create separate provider
