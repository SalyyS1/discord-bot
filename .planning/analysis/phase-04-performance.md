# Phase 04: Performance Optimizations

**Date:** 2026-01-27 | **Priority:** Medium | **Status:** Pending

---

## Context

Minor performance concerns identified: missing pagination, unbounded memory maps, startup overhead.

---

## Overview

| Metric           | Value     |
| ---------------- | --------- |
| Issues Found     | 5         |
| Estimated Effort | 2-3 hours |
| Risk Level       | Low       |

---

## Key Insights

1. Two API routes missing pagination
2. Memory maps in anti-spam could grow unbounded
3. Command loading startup could be parallelized

---

## Issue 1: Missing Pagination

### Affected Routes

```
apps/dashboard/src/app/api/guilds/[guildId]/autoresponders/route.ts
apps/dashboard/src/app/api/guilds/[guildId]/templates/route.ts
```

### Current

```typescript
const responders = await prisma.autoResponder.findMany({
  where: { guildId },
  orderBy: { createdAt: 'desc' },
});
```

### Solution

```typescript
const responders = await prisma.autoResponder.findMany({
  where: { guildId },
  orderBy: { createdAt: 'desc' },
  take: 100, // Reasonable limit
  skip: page * 100,
});
```

---

## Issue 2: Memory Map Size Limits

### File: `apps/bot/src/modules/security/antiSpam.ts`

### Current

```typescript
const memoryRateLimit = new Map<string, number[]>();
const memoryDuplicates = new Map<string, string[]>();
const memoryViolations = new Map<string, number>();
// Has cleanup interval but no max size
```

### Solution: Add LRU-style eviction

```typescript
const MAX_ENTRIES = 10000;

function setWithLimit<K, V>(map: Map<K, V>, key: K, value: V): void {
  if (map.size >= MAX_ENTRIES) {
    const firstKey = map.keys().next().value;
    map.delete(firstKey);
  }
  map.set(key, value);
}
```

---

## Issue 3: Command Loading Optimization

### File: `apps/bot/src/handlers/commandHandler.ts`

### Current (Sequential)

```typescript
for (const category of categories) {
  for (const file of files) {
    const module = await import(fileUrl);
    // Process sequentially
  }
}
```

### Solution: Parallel Loading

```typescript
const imports = await Promise.all(files.map((file) => import(new URL(file, dirUrl).href)));
```

Note: This is startup-only, so impact is limited. Consider if complexity is worth it.

---

## Issue 4: Pre-existing Type Errors

### Files with Type Errors

```
apps/dashboard/src/app/api/guilds/[guildId]/leveling/route.ts:175-176
apps/dashboard/src/app/api/guilds/[guildId]/giveaways/route.ts:34
apps/dashboard/src/app/api/guilds/[guildId]/products/route.ts
```

### Fixes

```typescript
// leveling/route.ts - xpMultipliers null check
const multipliers = (settings.xpMultipliers as Record<string, number> | null) ?? {};

// giveaways/route.ts - _count type
const giveaway = await prisma.giveaway.findUnique({
  include: { _count: { select: { entryList: true } } },
});
const entries = giveaway?._count?.entryList ?? 0;

// products/route.ts - Zod error type
const errors = zodError.errors.map((e) => e.message).join(', ');
```

---

## Issue 5: console.log Cleanup

### Files with console.log

```
apps/dashboard/src/lib/redis.ts          - Connection log
apps/bot/src/lib/shardUtils.ts           - Shutdown log
apps/bot/src/lib/prisma.ts               - Tenant log
```

### Fix

Replace `console.log` with appropriate logger calls.

---

## Todo List

- [ ] Add pagination to `autoresponders/route.ts`
- [ ] Add pagination to `templates/route.ts`
- [ ] Add `MAX_ENTRIES` limit to anti-spam memory maps
- [ ] Fix type error in `leveling/route.ts`
- [ ] Fix type error in `giveaways/route.ts`
- [ ] Fix type error in `products/route.ts`
- [ ] Replace console.log in `redis.ts`
- [ ] Replace console.log in `shardUtils.ts`
- [ ] Replace console.log in `prisma.ts`

---

## Success Criteria

- [ ] All routes have pagination (where applicable)
- [ ] Memory maps have size limits
- [ ] No console.log in production code
- [ ] All TypeScript errors resolved
- [ ] `pnpm typecheck` passes

---

## Risk Assessment

| Risk                               | Likelihood | Impact | Mitigation                        |
| ---------------------------------- | ---------- | ------ | --------------------------------- |
| Pagination breaks existing clients | Low        | Medium | Return count for client awareness |
| Map eviction drops valid data      | Low        | Low    | 10,000 limit is generous          |

---

## Next Steps

After completion:

1. Run full typecheck
2. Load test anti-spam under stress
3. Move to Phase 05 (Rate Limiting)
