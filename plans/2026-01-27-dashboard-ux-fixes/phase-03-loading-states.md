# Phase 03: Loading States

**Date:** 2026-01-27 | **Priority:** MEDIUM | **Status:** completed | **Effort:** 2h

---

## Overview

Replace waterfall fetch pattern with TanStack Query hooks and add skeleton loading states.

## Problem Analysis

**Current Autoresponder Page Issues:**

1. Waterfall: guilds load -> context init -> guildId set -> fetchGuildData()
2. Manual fetch() instead of useQuery (no caching, no deduplication)
3. Only shows spinner, no skeleton for content layout

---

## Requirements

1. Create `useAutoResponders` hook with TanStack Query
2. Create `useGuildRoles` and `useGuildChannels` hooks
3. Add skeleton components for autoresponder cards
4. Remove waterfall by fetching in parallel

---

## Related Files

| File                                                                           | Purpose             |
| ------------------------------------------------------------------------------ | ------------------- |
| `apps/dashboard/src/hooks/use-autoresponders.ts`                               | New hook            |
| `apps/dashboard/src/hooks/use-guild-roles.ts`                                  | New hook            |
| `apps/dashboard/src/hooks/use-guild-channels.ts`                               | New hook            |
| `apps/dashboard/src/components/skeletons/`                                     | Skeleton components |
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/autoresponder/page.tsx` | Refactor            |

---

## Implementation Steps

### Task 3.1: Create TanStack Query Hooks (45 min)

**File:** `apps/dashboard/src/hooks/use-autoresponders.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useAutoResponders(guildId: string | null) {
  return useQuery({
    queryKey: ['autoresponders', guildId],
    queryFn: async () => {
      const res = await fetch(`/api/guilds/${guildId}/autoresponders`);
      if (!res.ok) throw new Error('Failed to fetch autoresponders');
      const { data } = await res.json();
      return data as AutoResponder[];
    },
    enabled: !!guildId,
    staleTime: 30_000, // 30 seconds
    placeholderData: [], // Immediate render with empty array
  });
}

export function useCreateAutoResponder(guildId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAutoResponderInput) => {
      const res = await fetch(`/api/guilds/${guildId}/autoresponders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoresponders', guildId] });
    },
  });
}
```

**File:** `apps/dashboard/src/hooks/use-guild-roles.ts`

```typescript
import { useQuery } from '@tanstack/react-query';

export function useGuildRoles(guildId: string | null) {
  return useQuery({
    queryKey: ['roles', guildId],
    queryFn: async () => {
      const res = await fetch(`/api/guilds/${guildId}/roles`);
      if (!res.ok) throw new Error('Failed to fetch roles');
      const { data } = await res.json();
      return data as Role[];
    },
    enabled: !!guildId,
    staleTime: 5 * 60_000, // 5 minutes (roles change rarely)
  });
}
```

**File:** `apps/dashboard/src/hooks/use-guild-channels.ts`

```typescript
import { useQuery } from '@tanstack/react-query';

export function useGuildChannels(guildId: string | null, type?: 'text' | 'voice') {
  return useQuery({
    queryKey: ['channels', guildId, type],
    queryFn: async () => {
      const res = await fetch(`/api/guilds/${guildId}/channels`);
      if (!res.ok) throw new Error('Failed to fetch channels');
      const { data } = await res.json();
      if (type) {
        return data.filter((c: Channel) => c.type === type);
      }
      return data as Channel[];
    },
    enabled: !!guildId,
    staleTime: 5 * 60_000,
  });
}
```

### Task 3.2: Create Skeleton Components (30 min)

**File:** `apps/dashboard/src/components/skeletons/autoresponder-skeleton.tsx`

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function AutoResponderCardSkeleton() {
  return (
    <div className="p-4 rounded-lg border border-white/10 bg-white/5">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4 mt-1" />
    </div>
  );
}

export function AutoResponderListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <AutoResponderCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

### Task 3.3: Refactor Autoresponder Page (45 min)

**File:** `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/autoresponder/page.tsx`

Replace manual fetch pattern with hooks:

```tsx
// Before
const fetchGuildData = useCallback(async () => {
  const [rolesRes, channelsRes, respondersRes] = await Promise.all([...]);
  // manual state updates
}, [selectedGuildId]);

useEffect(() => { fetchGuildData(); }, [fetchGuildData]);

// After
const { data: roles = [], isLoading: rolesLoading } = useGuildRoles(selectedGuildId);
const { data: channels = [], isLoading: channelsLoading } = useGuildChannels(selectedGuildId, 'text');
const { data: responders = [], isLoading: respondersLoading, refetch } = useAutoResponders(selectedGuildId);

const isLoading = rolesLoading || channelsLoading || respondersLoading;
```

Update loading state display:

```tsx
// Before
if (guildsLoading) {
  return <Spinner />;
}

// After
if (guildsLoading) {
  return <PageSkeleton />;
}

{
  respondersLoading ? (
    <AutoResponderListSkeleton count={3} />
  ) : responders.length === 0 ? (
    <EmptyState onAdd={() => setIsDialogOpen(true)} />
  ) : (
    <AutoResponderList responders={responders} />
  );
}
```

---

## Todo List

- [x] Create `use-autoresponders.ts` hook
- [x] Create `use-guild-roles.ts` hook
- [x] Create `use-guild-channels.ts` hook (already existed)
- [x] Create skeleton component for autoresponder cards
- [x] Refactor autoresponder page to use hooks
- [x] Remove manual fetchGuildData function
- [x] Add loading skeletons to page
- [ ] Test loading states work correctly

---

## Success Criteria

1. Autoresponder page shows skeleton cards during initial load
2. No blank white screen during loading
3. Data is cached (navigating away and back is instant)
4. Create/Update/Delete invalidates cache automatically

---

## Risk Assessment

| Risk                       | Likelihood | Impact | Mitigation                     |
| -------------------------- | ---------- | ------ | ------------------------------ |
| State management conflicts | Medium     | Medium | Remove useState for responders |
| Type mismatches            | Low        | Low    | Keep existing interfaces       |
| Cache invalidation issues  | Low        | Medium | Test CRUD operations           |

---

## Testing

```bash
# Manual testing
1. Open Network tab in DevTools
2. Navigate to Autoresponder page
3. Verify skeleton shows immediately
4. Verify only 1 set of API calls made
5. Navigate away and back - should be instant (cached)
6. Create new responder - list should update
```
