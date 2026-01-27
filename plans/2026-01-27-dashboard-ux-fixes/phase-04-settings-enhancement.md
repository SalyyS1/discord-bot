# Phase 04: Settings Enhancement

**Date:** 2026-01-27 | **Priority:** MEDIUM | **Status:** completed | **Effort:** 1.5h

---

## Overview

Replace static/fake data in settings page with real APIs and add persistence for toggles.

## Problem Analysis

**Current Settings Page Issues (from scout):**

1. Uses setTimeout with hardcoded data (lines 56-66)
2. Notification toggles use `defaultChecked` - no persistence
3. Quick Links buttons have no actual hrefs
4. Danger Zone has no confirmation dialogs

---

## Requirements

1. Fetch real bot stats from API
2. Connect notification toggles to user preferences
3. Add actual links to Quick Links section
4. Add confirmation dialogs for danger zone actions

---

## Related Files

| File                                                                      | Purpose       |
| ------------------------------------------------------------------------- | ------------- |
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/settings/page.tsx` | Main refactor |
| `apps/dashboard/src/hooks/use-user-preferences.ts`                        | New hook      |
| `apps/dashboard/src/app/api/user/preferences/route.ts`                    | New API route |

---

## Implementation Steps

### Task 4.1: Create User Preferences Hook (30 min)

**File:** `apps/dashboard/src/hooks/use-user-preferences.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export function useUserPreferences() {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      const res = await fetch('/api/user/preferences');
      if (!res.ok) throw new Error('Failed to fetch preferences');
      return res.json() as Promise<UserPreferences>;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<UserPreferences>) => {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onMutate: async (newData) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['user-preferences'] });
      const previous = queryClient.getQueryData(['user-preferences']);
      queryClient.setQueryData(['user-preferences'], (old: UserPreferences) => ({
        ...old,
        ...newData,
      }));
      return { previous };
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(['user-preferences'], context?.previous);
    },
  });
}
```

### Task 4.2: Create Preferences API Route (20 min)

**File:** `apps/dashboard/src/app/api/user/preferences/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@repo/database';

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: true,
      theme: true,
      language: true,
    },
  });

  return NextResponse.json(
    user || {
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      theme: 'system',
      language: 'en',
    }
  );
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  return NextResponse.json(updated);
}
```

### Task 4.3: Refactor Settings Page (30 min)

**File:** `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/settings/page.tsx`

Remove fake data timeout, add real hooks:

```tsx
// Remove this:
useEffect(() => {
  const timer = setTimeout(() => {
    setStats({ guilds: 1, users: 150, commands: 45, uptime: 99.9 });
  }, 500);
  return () => clearTimeout(timer);
}, []);

// Add this:
const { data: preferences, isLoading } = useUserPreferences();
const { mutate: updatePreference } = useUpdatePreferences();

// Update toggles:
<Switch
  checked={preferences?.emailNotifications ?? true}
  onCheckedChange={(checked) => updatePreference({ emailNotifications: checked })}
/>;
```

### Task 4.4: Add Quick Links (10 min)

```tsx
<div className="space-y-2">
  <Button variant="ghost" className="w-full justify-start" asChild>
    <Link href="https://discord.gg/your-support-server" target="_blank">
      <MessageCircle className="mr-2 h-4 w-4" />
      Support Server
    </Link>
  </Button>
  <Button variant="ghost" className="w-full justify-start" asChild>
    <Link href="/docs" target="_blank">
      <FileText className="mr-2 h-4 w-4" />
      Documentation
    </Link>
  </Button>
  <Button variant="ghost" className="w-full justify-start" asChild>
    <Link href="https://github.com/your-repo/issues" target="_blank">
      <Bug className="mr-2 h-4 w-4" />
      Report Bug
    </Link>
  </Button>
</div>
```

### Task 4.5: Add Confirmation Dialogs (20 min)

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Wrap danger zone buttons:
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" className="w-full">
      <Trash className="mr-2 h-4 w-4" />
      Delete Account
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete your account and remove all your
        data from our servers.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDeleteAccount}>Delete Account</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>;
```

---

## Schema Update (Optional)

If User model doesn't have preference fields:

```prisma
model User {
  // ... existing fields

  // Preferences
  emailNotifications Boolean @default(true)
  pushNotifications  Boolean @default(true)
  marketingEmails    Boolean @default(false)
  theme              String  @default("system")
  language           String  @default("en")
}
```

---

## Todo List

- [x] Create `use-user-preferences.ts` hook
- [x] Create `/api/user/preferences` route (GET/PATCH)
- [x] Add preference fields to User model if needed (using cookies instead)
- [x] Refactor settings page to use hooks
- [x] Connect notification toggles to preferences
- [x] Add real links to Quick Links section
- [x] Add AlertDialog for danger zone actions
- [ ] Test toggle persistence works

---

## Success Criteria

1. Notification toggles persist after page refresh
2. Quick Links have working hrefs (open in new tab)
3. Danger zone shows confirmation before action
4. No fake/static data on settings page

---

## Risk Assessment

| Risk                      | Likelihood | Impact | Mitigation                        |
| ------------------------- | ---------- | ------ | --------------------------------- |
| User model missing fields | Medium     | Medium | Check schema first, add migration |
| Session/auth issues       | Low        | Medium | Use existing auth patterns        |

---

## Testing

```bash
# Manual testing
1. Open settings page
2. Toggle email notifications OFF
3. Refresh page - toggle should still be OFF
4. Click Quick Links - should open in new tab
5. Click "Delete Account" - should show confirmation dialog
6. Cancel - nothing should happen
```
