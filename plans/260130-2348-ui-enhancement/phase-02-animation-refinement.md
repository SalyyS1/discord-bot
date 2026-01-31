---
title: "Phase 2: Animation Refinement"
description: "Add page transitions, micro-interactions, and loading state animations"
status: pending
priority: P2
effort: 2h
---

# Phase 2: Animation Refinement

## Context Links

- [Main Plan](./plan.md)
- [Phase 1](./phase-01-component-polish.md) - Component Polish (dependency)
- [Motion Components](/apps/dashboard/src/components/motion/) - Existing animation primitives
- [Hero Section](/apps/dashboard/src/components/landing/hero-section.tsx) - Reference for animation patterns

---

## Overview

**Priority:** High
**Status:** Pending (blocked by Phase 1)
**Description:** Implement smooth page transitions, enhance loading states with shimmer animations, and add micro-interactions to dashboard elements.

---

## Key Insights

1. Motion components exist but are underutilized in dashboard pages
2. Landing page uses `motion` from Framer Motion extensively
3. `PageTransition` wrapper ready but not applied to dashboard layout
4. Skeleton components lack shimmer animation
5. Dashboard cards lack entry animations

---

## Requirements

### Functional
- Page transitions between dashboard routes
- Staggered card entry animations
- Skeleton shimmer for loading states
- Button/icon hover micro-interactions
- Smooth content reveals

### Non-Functional
- 60fps animations (no jank)
- Respect `prefers-reduced-motion`
- Keep bundle size minimal (reuse existing components)

---

## Architecture

### Page Transition Pattern

```tsx
// In dashboard layout
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/motion';

export default function DashboardLayout({ children }) {
  return (
    <AnimatePresence mode="wait">
      <PageTransition key={pathname}>
        {children}
      </PageTransition>
    </AnimatePresence>
  );
}
```

### Staggered Entry Pattern

```tsx
import { StaggerList, StaggerItem } from '@/components/motion';

<StaggerList className="grid gap-4">
  {items.map(item => (
    <StaggerItem key={item.id}>
      <Card>{item.content}</Card>
    </StaggerItem>
  ))}
</StaggerList>
```

---

## Related Code Files

### Files to Modify

| File | Change |
|------|--------|
| `apps/dashboard/src/app/[locale]/(dashboard)/layout.tsx` | Add PageTransition wrapper |
| `apps/dashboard/src/components/layout/animated-content.tsx` | Enhance with AnimatePresence |
| `apps/dashboard/src/components/skeletons/page-skeleton.tsx` | Add shimmer animation |
| `apps/dashboard/src/components/skeletons/settings-skeleton.tsx` | Add shimmer animation |
| `apps/dashboard/src/components/skeletons/autoresponder-skeleton.tsx` | Add shimmer animation |
| `apps/dashboard/src/components/motion/index.ts` | Export new utilities |

### Files to Create

| File | Purpose |
|------|---------|
| `apps/dashboard/src/components/motion/animated-card-grid.tsx` | Grid with staggered entry |
| `apps/dashboard/src/components/motion/icon-hover.tsx` | Icon micro-interaction wrapper |

---

## Implementation Steps

### 1. Add Page Transitions to Dashboard Layout

- [ ] Import AnimatePresence and PageTransition
- [ ] Get current pathname via usePathname hook
- [ ] Wrap children in PageTransition with pathname key
- [ ] Test route changes animate smoothly

**Implementation:**
```tsx
'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/motion';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main>
        <AnimatePresence mode="wait">
          <PageTransition key={pathname}>
            {children}
          </PageTransition>
        </AnimatePresence>
      </main>
    </div>
  );
}
```

### 2. Create AnimatedCardGrid Component

- [ ] Create component with staggered children
- [ ] Accept grid className customization
- [ ] Support configurable stagger delay

**Component:**
```tsx
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
  }
};

interface AnimatedCardGridProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedCardGrid({ children, className }: AnimatedCardGridProps) {
  return (
    <motion.div
      className={cn('grid gap-4', className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCardItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
```

### 3. Create IconHover Component

- [ ] Wrap icons with hover scale/rotate
- [ ] Spring physics for natural feel
- [ ] Configurable intensity

**Component:**
```tsx
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface IconHoverProps {
  children: React.ReactNode;
  className?: string;
  scale?: number;
  rotate?: number;
}

export function IconHover({
  children,
  className,
  scale = 1.1,
  rotate = 0
}: IconHoverProps) {
  return (
    <motion.div
      className={cn('inline-flex', className)}
      whileHover={{ scale, rotate }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  );
}
```

### 4. Add Shimmer to Skeleton Components

- [ ] Add shimmer overlay div to each skeleton
- [ ] Use existing animate-shimmer class from globals.css
- [ ] Apply to all skeleton components

**Pattern:**
```tsx
function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-white/5 border border-white/10">
      {/* Skeleton content */}
      <div className="p-6 space-y-4">
        <div className="h-4 w-1/3 bg-white/10 rounded" />
        <div className="h-8 w-2/3 bg-white/10 rounded" />
      </div>

      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}
```

### 5. Update Motion Exports

- [ ] Export AnimatedCardGrid
- [ ] Export AnimatedCardItem
- [ ] Export IconHover

**Update index.ts:**
```tsx
export * from './page-transition';
export * from './stagger-list';
export * from './hover-card';
export * from './fade-in';
export * from './animated-card-grid';
export * from './icon-hover';
```

### 6. Respect Reduced Motion Preference

- [ ] Add useReducedMotion hook usage
- [ ] Disable animations when preference set
- [ ] Test with prefers-reduced-motion: reduce

**Pattern:**
```tsx
import { useReducedMotion } from 'framer-motion';

function AnimatedComponent({ children }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div animate={{ ... }}>
      {children}
    </motion.div>
  );
}
```

---

## Todo List

- [ ] Dashboard layout: Add AnimatePresence + PageTransition
- [ ] Create animated-card-grid.tsx component
- [ ] Create icon-hover.tsx component
- [ ] page-skeleton.tsx: Add shimmer overlay
- [ ] settings-skeleton.tsx: Add shimmer overlay
- [ ] autoresponder-skeleton.tsx: Add shimmer overlay
- [ ] Update motion/index.ts exports
- [ ] Test page transitions between routes
- [ ] Test skeleton shimmer animations
- [ ] Verify prefers-reduced-motion respected
- [ ] Performance test on throttled CPU

---

## Success Criteria

1. Navigating between dashboard pages animates smoothly
2. Cards appear with staggered fade-in effect
3. Loading skeletons have shimmer animation
4. Icons respond to hover with subtle bounce
5. No layout shift during transitions
6. Animations disabled for reduced-motion users
7. No frame drops on 4x CPU throttle

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AnimatePresence layout issues | High | Medium | Test with mode="wait" |
| Performance degradation | High | Low | Use will-change, limit concurrent animations |
| Route key not updating | Medium | Low | Use pathname from usePathname |

---

## Security Considerations

N/A - Animation-only changes with no data handling.

---

## Next Steps

After completion, proceed to [Phase 3: Dashboard Consistency](./phase-03-dashboard-consistency.md)
