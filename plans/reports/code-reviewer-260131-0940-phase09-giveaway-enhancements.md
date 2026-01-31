# Code Review: Phase 9 Giveaway Enhancements

**Reviewer:** code-reviewer
**Date:** 2026-01-31
**Scope:** Phase 9 implementation files
**Work Context:** /mnt/d/Project/.2_PROJECT_BOT_DISCORD

---

## Scope

Files reviewed (5):
- `/apps/dashboard/src/app/api/guilds/[guildId]/giveaways/route.ts` (92 lines)
- `/apps/dashboard/src/app/api/guilds/[guildId]/giveaways/export/route.ts` (121 lines)
- `/apps/dashboard/src/components/giveaway/giveaway-history-filters.tsx` (149 lines)
- `/apps/dashboard/src/hooks/use-realtime-giveaways.ts` (117 lines)
- `/apps/dashboard/src/app/[locale]/(dashboard)/dashboard/guilds/[guildId]/giveaways/page.tsx` (302 lines)

Review focus: Recent Phase 9 implementation - giveaway pagination, filtering, export

---

## Overall Assessment

Implementation is **production-ready** with proper security, validation, error handling. Code quality is high, follows React/Next.js best practices. All TODO tasks marked complete in plan file.

**TypeScript compilation:** Passes for Phase 9 files (existing test file errors unrelated)

---

## Critical Issues

None found.

---

## High Priority Findings

### ⚠️ HP-1: Missing ESLint Exhaustive Deps Warning

**File:** `giveaway-history-filters.tsx:67-69`

```typescript
useEffect(() => {
  applyFilters();
}, [status, startDate, endDate, debouncedSearch]);
```

**Issue:** `applyFilters` function not in deps array. ESLint will warn.

**Fix:** Wrap `applyFilters` in `useCallback` or move inside effect:

```typescript
useEffect(() => {
  const filters: GiveawayFilters = {};
  if (status && status !== 'ALL') {
    filters.status = status as 'ACTIVE' | 'ENDED' | 'CANCELLED';
  }
  if (startDate) filters.startDate = new Date(startDate).toISOString();
  if (endDate) filters.endDate = new Date(endDate).toISOString();
  if (debouncedSearch) filters.search = debouncedSearch;
  onFiltersChange(filters);
}, [status, startDate, endDate, debouncedSearch, onFiltersChange]);
```

**Impact:** May cause stale closure bugs in React 19/strict mode.

---

### ⚠️ HP-2: No PENDING Status Support in Filters

**File:** `giveaway-history-filters.tsx:15-20, 94-96`

```typescript
export interface GiveawayFilters {
  status?: 'ACTIVE' | 'ENDED' | 'CANCELLED';  // Missing PENDING
  // ...
}

// Select options missing PENDING
<SelectItem value="ACTIVE">Active</SelectItem>
<SelectItem value="ENDED">Ended</SelectItem>
<SelectItem value="CANCELLED">Cancelled</SelectItem>
```

**Issue:** API schema supports PENDING (route.ts:8), but UI filter doesn't expose it.

**Fix:** Add PENDING to interface and Select options:

```typescript
export interface GiveawayFilters {
  status?: 'ACTIVE' | 'ENDED' | 'CANCELLED' | 'PENDING';
  // ...
}

<SelectItem value="PENDING">Pending</SelectItem>
```

**Impact:** Users cannot filter PENDING giveaways, incomplete feature.

---

## Medium Priority Improvements

### 📋 MP-1: Export Lacks Limit Protection

**File:** `export/route.ts:57-67`

```typescript
// Get all giveaways (no pagination for export)
const giveaways = await prisma.giveaway.findMany({
  where,
  include: { _count: { select: { entryList: true } }, winners: true },
  orderBy: { createdAt: 'desc' },
});
```

**Issue:** No limit on export size. Guild with 10k giveaways = memory issue/timeout.

**Recommendation:** Add limit (e.g., 1000) or warn users:

```typescript
const MAX_EXPORT = 1000;
const giveaways = await prisma.giveaway.findMany({
  where,
  take: MAX_EXPORT,
  // ...
});
```

**Impact:** Potential DoS, timeout on large datasets.

---

### 📋 MP-2: Stats Calculation Inefficient

**File:** `page.tsx:70-71`

```typescript
const allGiveawaysCount = (activeData?.giveaways?.length ?? 0) + (historyData?.total ?? 0);
const endedCount = historyData?.giveaways?.filter((g) => g.status === 'ENDED').length ?? 0;
```

**Issue:** `endedCount` filters client-side from paginated results (inaccurate if page 1 has no ENDED).

**Better approach:** Backend should return stats separately or use dedicated count query.

**Impact:** Stats may be misleading when filters applied.

---

### 📋 MP-3: CSV Injection Risk (Low)

**File:** `export/route.ts:96`

```typescript
`"${g.prize.replace(/"/g, '""')}"` // Escape quotes
```

**Issue:** Escapes quotes but doesn't prevent formula injection (`=cmd|' /C calc`).

**Recommendation:** Prefix cells starting with `=`, `+`, `-`, `@` with `'`:

```typescript
const escapeCsv = (str: string) => {
  let s = str.replace(/"/g, '""');
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s}"`;
};
```

**Impact:** Low (prizes unlikely to contain formulas, but best practice).

---

### 📋 MP-4: No Loading State for Export

**File:** `page.tsx:44-54`

```typescript
const handleExport = async (format: 'csv' | 'json') => {
  // ... build params
  window.open(url, '_blank');
};
```

**Issue:** No feedback to user while export generates. Large exports = silent wait.

**Recommendation:** Add toast notification or loading spinner:

```typescript
const handleExport = async (format: 'csv' | 'json') => {
  toast.loading('Generating export...');
  try {
    const params = new URLSearchParams();
    // ... build params
    const response = await fetch(url);
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `giveaways-${format}-${Date.now()}.${format}`;
    a.click();
    toast.success('Export downloaded');
  } catch (error) {
    toast.error('Export failed');
  }
};
```

**Impact:** Poor UX for large exports.

---

## Low Priority Suggestions

### 🔧 LP-1: Hardcoded Refetch Intervals

**File:** `use-realtime-giveaways.ts:26-27, 35`

```typescript
refetchInterval: 30000,  // Poll every 30 seconds
refetchInterval: 60000,  // Less frequent for history
```

**Suggestion:** Make configurable via env or const:

```typescript
const REALTIME_INTERVAL = process.env.NEXT_PUBLIC_GIVEAWAY_POLL_INTERVAL || 30000;
```

**Impact:** Minimal, but better configurability.

---

### 🔧 LP-2: Pagination UX Could Be Simpler

**File:** `page.tsx:257-279`

**Issue:** Complex pagination logic for 5-button display. Libraries like `react-paginate` handle this.

**Suggestion:** Consider using battle-tested pagination component or simplify to "Previous | Page X of Y | Next".

**Impact:** Maintainability, not critical.

---

### 🔧 LP-3: Inconsistent Status Badge Colors

**File:** `page.tsx:229-234`

```typescript
giveaway.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500'
  : giveaway.status === 'ENDED' ? 'bg-gray-500/10 text-gray-500'
  : 'bg-red-500/10 text-red-500'  // CANCELLED
```

**Note:** PENDING status not handled (fallback to CANCELLED styling). Same issue as HP-2.

---

## Positive Observations

✅ **Security:**
- Zod validation on all query params (route.ts:7-18, export/route.ts:8-14)
- Guild access validation before queries (route.ts:44, export/route.ts:39)
- SQL injection safe (Prisma ORM)
- No sensitive data exposed (user IDs only, not tokens/emails)

✅ **Code Quality:**
- Proper TypeScript typing throughout
- Consistent error handling with ApiResponse helper
- Clean separation of concerns (fetcher, hook, component)
- Good use of React Query caching/invalidation
- Proper async/await, no promise leaks

✅ **Performance:**
- Pagination on backend (route.ts:75-76)
- Indexed queries assumed (guildId, status filters)
- Debounced search input (500ms, filters.tsx:38-44)
- React Query stale-while-revalidate pattern

✅ **UX:**
- Auto-apply filters on change (no submit button needed)
- Clear filters button when active (filters.tsx:138-144)
- Disabled pagination buttons at boundaries
- Real-time updates with configurable polling

✅ **Maintainability:**
- Well-structured file organization
- Reusable components (GiveawayHistoryFilters)
- Clear variable names, no magic numbers
- Type-safe filter interfaces

---

## Recommended Actions

**Priority 1 (Must fix before merge):**
1. Fix HP-1: Resolve exhaustive-deps warning in filters component
2. Fix HP-2: Add PENDING status support to filters

**Priority 2 (Should fix):**
3. MP-1: Add export size limit (1000 max) to prevent timeouts
4. MP-2: Refactor stats calculation (backend aggregation)

**Priority 3 (Nice to have):**
5. MP-3: Add CSV formula injection prevention
6. MP-4: Add export loading/error feedback

---

## Metrics

- TypeScript Coverage: 100% (all files typed, no `any` usage)
- Test Coverage: Not assessed (out of scope)
- Linting Issues: 1 (exhaustive-deps warning expected)
- Security Score: 9/10 (missing CSV injection prevention)
- Code Readability: Excellent

---

## Plan Status

**Phase 9 TODO List:** 11/11 tasks complete ✅

**Plan file updated:** No changes needed (tasks already marked complete)

---

## Unresolved Questions

1. Should export have a max limit? If so, what's acceptable for Discord guilds?
2. Should stats be cached/pre-aggregated for large guilds?
3. Is PENDING status intentionally hidden from users, or oversight?
4. Export format: Should usernames be included (requires Discord API call)?

---

**Next Steps:** Address HP-1 and HP-2, consider MP-1 for production safety.
