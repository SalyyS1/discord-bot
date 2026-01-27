---
stage: "2"
phase: "01"
title: "Loading States"
status: complete
effort: 2h
---

# Phase 2.1: Loading States

**Parent**: [Stage 2 Overview](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-2-usability/overview.md)

## Requirements

1. Global loading overlay during guild switch
2. Skeleton loaders for all data tables
3. Empty states with feature-specific guidance

## Implementation

### Global Loading Context

```typescript
// apps/dashboard/src/context/loading-context.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isGuildSwitching: boolean;
  startGuildSwitch: () => void;
  endGuildSwitch: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isGuildSwitching, setIsGuildSwitching] = useState(false);

  return (
    <LoadingContext.Provider
      value={{
        isGuildSwitching,
        startGuildSwitch: () => setIsGuildSwitching(true),
        endGuildSwitch: () => setTimeout(() => setIsGuildSwitching(false), 300),
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}
```

### Loading Overlay Component

```typescript
// apps/dashboard/src/components/loading-overlay.tsx
export function LoadingOverlay() {
  const { isGuildSwitching } = useLoadingContext();
  if (!isGuildSwitching) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      <span>Switching server...</span>
    </div>
  );
}
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/dashboard/src/context/loading-context.tsx` | **NEW** |
| `apps/dashboard/src/components/loading-overlay.tsx` | **NEW** |
| `apps/dashboard/src/app/[locale]/(dashboard)/layout.tsx` | Add LoadingProvider |
| `apps/dashboard/src/components/server-selector.tsx` | Use loading context |

## Todo

- [ ] Create loading context
- [ ] Create loading overlay component
- [ ] Integrate in dashboard layout
- [ ] Update server selector to trigger loading

## Success Criteria

- Guild switch shows loading overlay
- No flash of incorrect data during switch
