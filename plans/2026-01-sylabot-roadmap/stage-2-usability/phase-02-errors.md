---
stage: "2"
phase: "02"
title: "Error Handling"
status: complete
effort: 2h
---

# Phase 2.2: Error Handling

**Parent**: [Stage 2 Overview](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-2-usability/overview.md)

## Requirements

1. Contextual error messages (not generic "Something went wrong")
2. Retry actions for failed requests
3. Fallback UI for error states

## Implementation

### Error Boundary Component

```typescript
// apps/dashboard/src/components/error-boundary.tsx
export function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <Button onClick={resetErrorBoundary}>Try Again</Button>
    </div>
  );
}
```

### Query Error UI

```typescript
// Pattern for data fetching pages
if (error) {
  return (
    <ErrorCard
      title="Failed to load settings"
      message={error.message}
      onRetry={() => refetch()}
    />
  );
}
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/dashboard/src/components/error-boundary.tsx` | **NEW** |
| `apps/dashboard/src/components/error-card.tsx` | **NEW** |
| Dashboard pages | Add error UI patterns |

## Todo

- [ ] Create error boundary component
- [ ] Create reusable error card
- [ ] Add error handling to settings pages
- [ ] Add retry buttons

## Success Criteria

- Errors show contextual messages
- User can retry failed actions
