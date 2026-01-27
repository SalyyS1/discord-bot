# Dashboard UX Patterns Research

**Date:** 2026-01-27 | **Scope:** React/Next.js Dashboard UX 2024-2026

---

## 1. Data Loading Patterns

### Why Data Appears Blank Then Loads Late

**Root Causes:**

- `enabled: false` until context ready (guild selection not initialized)
- No `placeholderData` or `initialData` → shows nothing during fetch
- Client-side hydration mismatch - server renders empty, client fetches
- Missing Suspense boundaries around data-dependent components

**Current Codebase Issues Found:**

```typescript
// use-guild-settings.ts - enabled waits for guildId
enabled: !!guildId; // Shows nothing until guildId exists
```

### Quick Fixes

**1. Use placeholderData for instant feedback:**

```typescript
useQuery({
  queryKey: ['stats', guildId],
  queryFn: fetchStats,
  placeholderData: { members: 0, tickets: 0 }, // Instant render
  enabled: !!guildId,
});
```

**2. Skeleton-first pattern:**

```tsx
{
  isPending ? <StatsSkeleton /> : <StatsCard data={data} />;
}
```

### Skeleton vs Spinner Guidelines

| Use Case        | Pattern         | Why                                |
| --------------- | --------------- | ---------------------------------- |
| Page load       | Skeleton        | Perceived faster, maintains layout |
| Form submit     | Button spinner  | User knows action pending          |
| Infinite scroll | Skeleton rows   | Matches existing content           |
| Data refresh    | Stale + spinner | Keep old data visible              |

### TanStack Query Optimization

**Your current config (query-provider.tsx):**

```typescript
staleTime: 60 * 1000,  // 1 min - good for dashboards
gcTime: 5 * 60 * 1000, // 5 min cache
refetchOnWindowFocus: false, // Correct for dashboards
```

**Recommended per-query overrides:**

```typescript
// Static data (guilds list)
staleTime: 5 * 60 * 1000  // 5 min - matches your use-guilds.ts

// Frequently changing (stats)
staleTime: 30_000,  // 30s - matches your use-guild-settings.ts

// Real-time needs
staleTime: 10_000,
refetchInterval: 10_000,
```

---

## 2. Navigation/Routing Issues

### Common Wrong Route Causes

1. **DropdownMenuItem asChild not forwarding events** - clicks close menu but don't navigate
2. **router.push vs Link** - router.push doesn't preload, Link does
3. **Locale prefix missing** - Next.js i18n routes need `/{locale}/path`

### Dropdown Menu Link Handling (Your Codebase)

**Problem Pattern Found (user-dropdown.tsx):**

```tsx
<DropdownMenuItem asChild>
  <Link href="/dashboard/settings">...</Link> // Works correctly
</DropdownMenuItem>
```

**Pattern That Fails:**

```tsx
<DropdownMenuItem onClick={() => router.push('/path')}>
  // Menu closes before navigation completes
</DropdownMenuItem>
```

**Fix for action-based navigation:**

```tsx
<DropdownMenuItem
  onSelect={(e) => {
    e.preventDefault();  // Prevent menu close
    router.push('/path');
  }}
>
```

### Next.js App Router Best Practices

```tsx
// PREFER: Link component with prefetching
<Link href="/dashboard" prefetch={true}>

// AVOID: router.push for regular navigation
// Only use for programmatic navigation after actions
```

---

## 3. Dashboard Statistics - Member Count Discrepancy

### Online vs Total Members Issue

**Root Cause:** `guild.memberCount` requires `GuildMembers` intent + cached members.

**Your Bot Code (welcome/index.ts):**

```typescript
memberCount: member.guild.memberCount,  // From Discord.js cache
```

**Why counts differ:**

1. **Bot cache** = only members seen since bot started
2. **Database** = all members ever tracked (`prisma.member.count`)
3. **Discord API** = actual total (requires privileged intent)

### Stats Route Analysis (stats/route.ts)

```typescript
// Your current approach - uses DATABASE count
memberCount = await prisma.member.count({ where: { guildId } });
// This counts members in YOUR database, not Discord's actual count
```

### Recommended Fix

```typescript
// Option 1: Hybrid approach (preferred)
const stats = {
  totalMembers: guildFromDiscord.memberCount,  // API call to manager
  trackedMembers: await prisma.member.count(), // Your database
};

// Option 2: Label clearly
<StatCard
  label="Tracked Members"  // Not "Total Members"
  value={memberCount}
/>
```

### Real-time vs Cached Display

| Data Type    | Strategy                           | Implementation         |
| ------------ | ---------------------------------- | ---------------------- |
| Member count | Cache 5min, fetch from manager API | staleTime: 300000      |
| Active today | Real-time (10s refresh)            | refetchInterval: 10000 |
| Total XP     | Cache 1min                         | staleTime: 60000       |
| Tickets open | Real-time when viewing             | refetchOnMount: true   |

---

## Summary Fixes

1. **Blank data → Skeleton:** Add `placeholderData` or wrap in Suspense
2. **Late loading:** Increase `staleTime` for static data, prefetch on hover
3. **Wrong navigation:** Use `<Link>` inside `DropdownMenuItem asChild`, not onClick
4. **Member count wrong:** Clarify "Tracked Members" vs "Discord Members", add API to fetch real count from bot manager

---

## Unresolved Questions

1. Is manager API available to fetch real-time guild.memberCount from bot?
2. Should we implement WebSocket for truly real-time stats?
3. Consider `useSuspenseQuery` migration for simpler loading states?
