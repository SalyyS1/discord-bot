# Discord Bot Dashboard UX Patterns

## 1. Member Data - "Unknown" Username Issue

### Root Causes

1. **Missing intent** - `GuildMembers` intent not enabled; cache empty
2. **Partials not handled** - Reactions/events return partial users without username
3. **Dashboard API mismatch** - Bot caches members, dashboard API call returns stale/no data
4. **User left server** - ID exists in DB but user no longer fetchable

### Solutions

```typescript
// Discord.js: Force fetch, bypass cache
const member = await guild.members.fetch({ user: userId, force: true });

// Handle missing gracefully
const displayName = member?.user?.username ?? `User#${userId.slice(-4)}`;
```

```typescript
// Dashboard API: Batch fetch with fallback
async function enrichUsernames(userIds: string[], guildId: string) {
  const members = await discordService.getGuildMembers(guildId, userIds);
  return userIds.map((id) => ({
    id,
    name: members.find((m) => m.id === id)?.user?.username ?? `Unknown (${id.slice(-4)})`,
  }));
}
```

### Best Practice

- Store `username` alongside `userId` at event time (denormalize)
- Accept stale names; users change usernames anyway
- Show truncated ID as fallback, never just "Unknown"

---

## 2. Settings Page UX Patterns

### Form Organization

| Pattern           | Use Case                                                           |
| ----------------- | ------------------------------------------------------------------ |
| Grouped sections  | Related settings (e.g., Welcome Message > Channel, Content, Embed) |
| Tabs              | Feature categories (Basic, Advanced, Restrictions)                 |
| Collapsible cards | Optional/advanced settings hidden by default                       |

### Save Patterns Comparison

| Pattern                    | Pros                                | Cons                       |
| -------------------------- | ----------------------------------- | -------------------------- |
| **Auto-save (debounced)**  | No save button; feels modern        | Confusing if network fails |
| **Explicit save button**   | Clear intent; easy undo             | Extra click friction       |
| **Dirty indicator + save** | Best balance; shows pending changes | Requires state tracking    |

### Recommended: Optimistic Update + Dirty Tracking

```typescript
// Already in codebase: use-mutations.ts pattern
const mutation = useMutation({
  mutationFn: async (data) => {
    /* ... */
  },
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old) => ({ ...old, ...newData }));
    return { previous };
  },
  onError: (err, newData, ctx) => {
    queryClient.setQueryData(queryKey, ctx.previous); // rollback
    toast.error('Save failed');
  },
});
```

### Unsaved Changes Guard

- Track `isDirty` state via form library or manual diff
- Block navigation with `beforeunload` + router guards
- Show "Unsaved Changes" dialog (already have: `unsaved-changes-dialog.tsx`)

---

## 3. Autoresponder/Config Lists UX

### Pagination Pattern

```typescript
// Server-side cursor pagination
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['autoresponders', guildId],
  queryFn: ({ pageParam = null }) => fetchAutoresponders(guildId, pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

### Loading States

| State        | UI Pattern                     |
| ------------ | ------------------------------ |
| Initial load | Skeleton cards (3-5 items)     |
| Paginating   | Inline spinner at bottom       |
| Creating     | Optimistic insert + ghost card |
| Deleting     | Fade out + optimistic remove   |

### Empty State Best Practice

```tsx
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-12">
      <Zap className="mx-auto h-12 w-12 text-gray-600" />
      <h3 className="mt-4 text-lg font-medium text-white">No autoresponders yet</h3>
      <p className="mt-2 text-gray-400">Create your first trigger to get started</p>
      <Button onClick={onAdd} className="mt-6">
        <Plus className="mr-2 h-4 w-4" /> Add Autoresponder
      </Button>
    </div>
  );
}
```

### CRUD Operations

| Action | UX Pattern                                                     |
| ------ | -------------------------------------------------------------- |
| Create | Modal/dialog; focus first field                                |
| Edit   | Inline edit OR same modal; prefill form                        |
| Delete | Confirmation dialog with item name; "type to confirm" for bulk |
| Toggle | Immediate switch; no confirm needed                            |

### Filtering & Search

- Debounce search input (300ms)
- Filter chips: enabled/disabled/all
- Client-side filter for <100 items; server-side for more

---

## Key Takeaways

1. **Never show raw "Unknown"** - Use `User#1234` fallback with truncated ID
2. **Denormalize usernames** - Store at event time; accept staleness
3. **Optimistic updates** - Already implemented in `use-mutations.ts`; extend to lists
4. **Empty states need CTAs** - Always include action button
5. **Dirty tracking** - Use `useUnsavedChanges` hook before navigation

## Unresolved Questions

- Rate limits for bulk member fetch in dashboard API?
- Should username refresh be manual (button) or periodic (background)?
