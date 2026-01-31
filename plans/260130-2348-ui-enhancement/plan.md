---
title: "Dashboard UI Enhancement"
description: "Elevate dashboard components and animations to match landing page polish"
status: completed
priority: P2
effort: 6h
branch: main
tags: [ui, dashboard, polish, animation, framer-motion]
created: 2026-01-30
---

# Dashboard UI Enhancement Plan

## Overview

Elevate the dashboard experience to match the excellent landing page design. The landing page demonstrates sophisticated glass effects, glow animations, and micro-interactions. This plan brings that same polish to the dashboard components and pages.

## Current State Analysis

### Landing Page Strengths (Reference)
- Animated gradient orbs with parallax scrolling
- Floating icons with spring physics
- Glass-morphism cards with hover glow
- Ripple effect buttons
- Smooth page transitions with Framer Motion
- Staggered reveal animations

### Dashboard Gaps Identified
- Components lack consistent hover states
- Minimal use of existing motion components (`FadeIn`, `StaggerList`, `HoverCard`)
- `Textarea` missing focus glow (unlike `Input`)
- `Select` lacks visual polish compared to other inputs
- Dashboard pages don't use page transitions
- Cards missing interactive hover feedback
- No loading state animations

## Design System Assets (Already Available)

### CSS Utilities in globals.css
- `.glass` - Glass morphism base
- `.surface-card` - Gradient card backgrounds
- `.icon-badge-*` - Colored icon containers
- `.glow-*` - Glow shadows (aqua, purple, pink, blue, yellow, green)
- `.animate-*` - Keyframe animations (float, shimmer, glow-pulse, gradient-x)

### Motion Components
- `PageTransition` - Page entry/exit animation
- `FadeIn` - Directional fade with delay
- `StaggerList`/`StaggerItem` - Sequential reveal
- `HoverCard` - Lift + scale on hover
- `GlowEffect` - Reusable glow wrapper

### UI Components with Polish
- `Button` - Has ripple effect, glow variant
- `Input` - Has focus glow + blur background
- `Switch` - Spring animation on toggle
- `Progress` - Gradient indicator
- `GlassCard` - Shimmer option, glow variants
- `Card` - Has glass and glassHover variants

---

## Phases

| Phase | Focus | Status | Est. Time |
|-------|-------|--------|-----------|
| [Phase 1](./phase-01-component-polish.md) | Component Polish | completed | 2h |
| [Phase 2](./phase-02-animation-refinement.md) | Animation Refinement | completed | 2h |
| [Phase 3](./phase-03-dashboard-consistency.md) | Dashboard Consistency | completed | 2h |

---

## Phase 1: Component Polish

Elevate form elements and interactive components with focus states, hover feedback, glow effects.

**Files:**
- `components/ui/textarea.tsx`
- `components/ui/select.tsx`
- `components/ui/card.tsx`
- `components/ui/badge.tsx`
- `components/ui/progress.tsx`

## Phase 2: Animation Refinement

Add page transitions, micro-interactions, loading states across dashboard.

**Files:**
- `components/motion/index.ts` (exports)
- `app/[locale]/(dashboard)/layout.tsx`
- `components/layout/animated-content.tsx`
- `components/skeletons/*.tsx`

## Phase 3: Dashboard Consistency

Apply landing page patterns to dashboard pages systematically.

**Files:**
- `app/[locale]/(dashboard)/dashboard/page.tsx`
- `app/[locale]/(dashboard)/dashboard/settings/page.tsx`
- All module pages (tickets, leveling, moderation, etc.)

---

## Dependencies

```
Phase 1 (Components)
    |
    v
Phase 2 (Animations) <-- Depends on polished components
    |
    v
Phase 3 (Pages) <-- Uses both polished components and animations
```

---

## Success Criteria

1. All form inputs have consistent focus glow effects
2. Cards respond to hover with subtle lift/glow
3. Dashboard pages use `PageTransition` wrapper
4. Loading states use skeleton shimmer animations
5. No jarring transitions between pages
6. Performance: No animation jank on mid-range devices
7. Light/dark themes both work correctly

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Animation performance | Use `will-change-transform`, limit simultaneous animations |
| Breaking existing styles | Changes are additive, test each component |
| Theme incompatibility | All CSS uses design tokens (var(--*)) |

---

## Unresolved Questions

None currently. Plan is ready for implementation.
