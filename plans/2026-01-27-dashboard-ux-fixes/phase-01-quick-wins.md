# Phase 01: Quick Wins

**Date:** 2026-01-27 | **Priority:** HIGH | **Status:** completed | **Effort:** 30min

---

## Overview

Two immediate fixes with high impact and minimal code changes.

## Requirements

1. Fix Profile navigation to point to /profile instead of /dashboard/settings
2. Update member count label to "Tracked Members" for accuracy

---

## Related Files

| File                                                             | Purpose          |
| ---------------------------------------------------------------- | ---------------- |
| `apps/dashboard/src/components/user-dropdown.tsx`                | Fix Profile link |
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/page.tsx` | Update label     |

---

## Implementation Steps

### Task 1.1: Fix Profile Navigation (5 min)

**File:** `apps/dashboard/src/components/user-dropdown.tsx`

**Current Code (line 64):**

```tsx
<Link href="/dashboard/settings" className="flex items-center">
```

**Change to:**

```tsx
<Link href="/profile" className="flex items-center">
```

**Verification:**

- Profile menu item opens `/profile` page
- Settings menu item still opens `/dashboard/settings`

### Task 1.2: Update Member Count Label (10 min)

**File:** `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/page.tsx`

Find the stat card displaying member count and update label from "Members" to "Tracked Members" to accurately reflect database count vs Discord count.

**Why:** Current count uses `prisma.member.count()` which only counts members who interacted with bot, not actual Discord memberCount.

---

## Todo List

- [x] Update Profile link href from `/dashboard/settings` to `/profile`
- [x] Update member count stat card label to "Tracked Members"
- [x] Test navigation in browser
- [x] Verify both changes don't break any other functionality

---

## Success Criteria

1. Clicking "Profile" in user dropdown navigates to `/profile`
2. Clicking "Settings" in user dropdown navigates to `/dashboard/settings`
3. Dashboard shows "Tracked Members" label for member count stat

---

## Risk Assessment

| Risk                        | Likelihood | Impact | Mitigation                                    |
| --------------------------- | ---------- | ------ | --------------------------------------------- |
| /profile page doesn't exist | Low        | High   | Already verified exists at `profile/page.tsx` |
| i18n issues with label      | Low        | Low    | Use existing translation patterns             |

---

## Testing

```bash
# Manual testing
1. Login to dashboard
2. Click user avatar dropdown
3. Click "Profile" - verify /profile opens
4. Go back, click "Settings" - verify /dashboard/settings opens
5. Check dashboard overview - verify "Tracked Members" label
```
