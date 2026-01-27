# Phase 01: Dashboard Query Key Redesign

> Parent: [plan.md](./plan.md)

## Overview

| Field | Value |
|-------|-------|
| Priority | P1 Critical |
| Effort | 1.5 hours |
| Files | 4 |

## Requirements

1. Query keys MUST be namespaced by guildId
2. Guild switch MUST cancel in-flight queries
3. Old guild cache MUST be removed (not just invalidated)
4. No window events or force-rerender hacks

## Query Key Convention

```typescript
// keys.ts - centralized key factory
export const queryKeys = {
  guilds: ['guilds'] as const,
  guild: (guildId: string) => ['guild', guildId] as const,
  guildSettings: (guildId: string) => ['guild', guildId, 'settings'] as const,
  guildChannels: (guildId: string) => ['guild', guildId, 'channels'] as const,
  guildRoles: (guildId: string) => ['guild', guildId, 'roles'] as const,
  leaderboard: (guildId: string) => ['guild', guildId, 'leaderboard'] as const,
};
```

## Implementation Steps

### Step 1: Create Query Key Factory

**File:** `apps/dashboard/src/lib/query-keys.ts`

```typescript
export const queryKeys = {
  guilds: ['guilds'] as const,
  guild: (guildId: string) => ['guild', guildId] as const,
  guildSettings: (guildId: string) => ['guild', guildId, 'settings'] as const,
  guildChannels: (guildId: string) => ['guild', guildId, 'channels'] as const,
  guildRoles: (guildId: string) => ['guild', guildId, 'roles'] as const,
} as const;
```

### Step 2: Update Hooks to Use New Keys

**File:** `apps/dashboard/src/hooks/use-guild-settings.ts`

```typescript
import { queryKeys } from '@/lib/query-keys';

export function useGuildSettings(guildId: string | null) {
  return useQuery({
    queryKey: guildId ? queryKeys.guildSettings(guildId) : ['noop'],
    queryFn: () => fetchGuildSettings(guildId!),
    enabled: !!guildId,
    staleTime: 30_000, // 30s (not 0 to avoid over-fetching)
  });
}
```

**File:** `apps/dashboard/src/hooks/use-guild-channels.ts` — same pattern

### Step 3: Guild Switch Handler

**File:** `apps/dashboard/src/components/server-selector.tsx`

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

const queryClient = useQueryClient();

const handleSelectGuild = async (newGuildId: string) => {
  const oldGuildId = selectedGuildId;
  
  // 1. Cancel any in-flight queries for OLD guild
  if (oldGuildId) {
    await queryClient.cancelQueries({ 
      queryKey: queryKeys.guild(oldGuildId) 
    });
  }
  
  // 2. Remove old guild cache entirely (not just invalidate)
  if (oldGuildId && oldGuildId !== newGuildId) {
    queryClient.removeQueries({ 
      queryKey: queryKeys.guild(oldGuildId) 
    });
  }
  
  // 3. Update selected guild (triggers refetch via enabled)
  setSelectedGuildId(newGuildId);
  
  // 4. Optional: Prefetch new guild data for smooth UX
  queryClient.prefetchQuery({
    queryKey: queryKeys.guildSettings(newGuildId),
    queryFn: () => fetchGuildSettings(newGuildId),
    staleTime: 30_000,
  });
};
```

### Step 4: Update Mutations

**File:** `apps/dashboard/src/hooks/use-mutations.ts`

Refactor to single generic mutation + use new keys:

```typescript
import { queryKeys } from '@/lib/query-keys';

export function useUpdateGuildSettings(guildId: string | null) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/guilds/${guildId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onMutate: async (newData) => {
      if (!guildId) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.guildSettings(guildId) });
      const previous = queryClient.getQueryData(queryKeys.guildSettings(guildId));
      queryClient.setQueryData(queryKeys.guildSettings(guildId), (old: any) => ({
        ...old,
        ...newData,
      }));
      return { previous };
    },
    onError: (_, __, context) => {
      if (guildId && context?.previous) {
        queryClient.setQueryData(queryKeys.guildSettings(guildId), context.previous);
      }
    },
    onSettled: () => {
      if (guildId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.guildSettings(guildId) });
      }
    },
  });
}
```

### Step 5: Remove Window Event Hack

**File:** `apps/dashboard/src/hooks/use-selected-guild.ts`

Remove lines 62-71 entirely (the `guild-changed` event listener).

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/query-keys.ts` | **NEW** - Key factory |
| `src/hooks/use-guild-settings.ts` | Use new keys |
| `src/hooks/use-guild-channels.ts` | Use new keys |
| `src/hooks/use-mutations.ts` | Refactor + new keys |
| `src/hooks/use-selected-guild.ts` | Remove event hack |
| `src/components/server-selector.tsx` | Proper cache ops |

## Success Criteria

- [ ] Switching guilds shows new data immediately
- [ ] No stale data flash on switch
- [ ] `pnpm typecheck` passes
- [ ] Network tab shows only new guild requests after switch
