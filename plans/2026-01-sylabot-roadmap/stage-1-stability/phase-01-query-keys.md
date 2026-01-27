---
stage: "1"
phase: "01"
title: "Query Key Discipline"
status: complete
priority: P1
effort: 1h
---

# Phase 1.1: Query Key Discipline

**Parent**: [Stage 1 Overview](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-1-stability/overview.md)

## Overview

Establish strict query key conventions. Ensure guild switch never shows stale data.

## Query Key Convention

```typescript
export const queryKeys = {
  guilds: ['guilds'] as const,
  guild: (guildId: string) => ['guild', guildId] as const,
  guildSettings: (guildId: string) => ['guild', guildId, 'settings'] as const,
  guildChannels: (guildId: string) => ['guild', guildId, 'channels'] as const,
  guildRoles: (guildId: string) => ['guild', guildId, 'roles'] as const,
} as const;
```

## Cache Operations on Guild Switch

```typescript
async function handleGuildSwitch(oldGuildId: string | null, newGuildId: string) {
  // 1. Cancel in-flight queries for OLD guild
  if (oldGuildId) {
    await queryClient.cancelQueries({ queryKey: queryKeys.guild(oldGuildId) });
  }

  // 2. REMOVE (not invalidate) old guild cache
  if (oldGuildId && oldGuildId !== newGuildId) {
    queryClient.removeQueries({ queryKey: queryKeys.guild(oldGuildId) });
  }

  // 3. Update selected guild ID
  setSelectedGuildId(newGuildId);

  // 4. Prefetch critical data
  await queryClient.prefetchQuery({
    queryKey: queryKeys.guildSettings(newGuildId),
    queryFn: () => fetchGuildSettings(newGuildId),
  });
}
```

## Files to Modify

| File | Change |
|------|--------|
| `apps/dashboard/src/lib/query-keys.ts` | **NEW** - Query key factory |
| `apps/dashboard/src/components/server-selector.tsx` | Use cache operations |
| `apps/dashboard/src/hooks/use-guild-settings.ts` | Use namespaced keys |
| `apps/dashboard/src/hooks/use-guild-channels.ts` | Use namespaced keys |
| `apps/dashboard/src/hooks/use-selected-guild.ts` | Remove window event hack |

## Todo

- [ ] Create `query-keys.ts`
- [ ] Update `server-selector.tsx`
- [ ] Update all hooks to use namespaced keys
- [ ] Remove window event patterns
- [ ] Verify no flat query keys remain

## Success Criteria

- `grep -r "queryKey: \['settings'\]"` returns 0 matches
- Rapid guild switching shows only final selection's data
