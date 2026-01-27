---
stage: "2"
phase: "04"
title: "Form Experience"
status: complete
effort: 2h
---

# Phase 2.4: Form Experience

**Parent**: [Stage 2 Overview](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-2-usability/overview.md)

## Requirements

1. Unsaved changes warning when navigating away
2. Clear validation feedback
3. Loading states on form submit
4. Dirty indicator badge

## Implementation

### Unsaved Changes Hook

```typescript
export function useUnsavedChanges({ initialValue, currentValue, onSave }) {
  const isDirty = JSON.stringify(initialValue) !== JSON.stringify(currentValue);
  
  // Block browser close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
  
  return { isDirty };
}
```

### Unsaved Changes Dialog

```typescript
<AlertDialog open={showDialog}>
  <AlertDialogContent>
    <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
    <AlertDialogDescription>
      You have unsaved changes. What would you like to do?
    </AlertDialogDescription>
    <AlertDialogFooter>
      <Button onClick={onCancel}>Cancel</Button>
      <Button variant="destructive" onClick={onDiscard}>Discard</Button>
      <Button onClick={onSave}>Save & Continue</Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/dashboard/src/hooks/use-unsaved-changes.ts` | **NEW** |
| `apps/dashboard/src/components/unsaved-changes-dialog.tsx` | **NEW** |
| `apps/dashboard/src/components/dirty-indicator.tsx` | **NEW** |
| Settings pages | Integrate hook |

## Pages to Update

- Ticket settings page
- Voice settings page
- Leveling settings page
- Welcome settings page

## Todo

- [ ] Create unsaved changes hook
- [ ] Create confirmation dialog
- [ ] Create dirty indicator badge
- [ ] Integrate in settings pages

## Success Criteria

- Navigating away from unsaved form shows warning
- Browser close/refresh shows native dialog
