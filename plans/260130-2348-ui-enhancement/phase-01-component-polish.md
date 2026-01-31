---
title: "Phase 1: Component Polish"
description: "Elevate form elements and interactive components with focus states and hover feedback"
status: pending
priority: P2
effort: 2h
---

# Phase 1: Component Polish

## Context Links

- [Main Plan](./plan.md)
- [globals.css](/apps/dashboard/src/app/globals.css) - Design tokens and utilities
- [Input Component](/apps/dashboard/src/components/ui/input.tsx) - Reference implementation with focus glow

---

## Overview

**Priority:** High
**Status:** Pending
**Description:** Add consistent focus glow, hover states, and micro-interactions to form components. Use the polished `Input` component as the reference pattern.

---

## Key Insights

1. `Input` already has focus glow + blur background - replicate this pattern
2. `Textarea` is missing focus effects entirely
3. `Select` uses basic shadcn styling without glass effects
4. `Card` has variants but hover variant is underutilized
5. `Badge` could benefit from subtle glow for status indicators

---

## Requirements

### Functional
- Textarea focus glow matching Input component
- Select dropdown with glass effect and focus ring
- Card hover states with subtle lift
- Badge glow variants for status indicators

### Non-Functional
- Maintain accessibility (focus-visible rings)
- No performance degradation
- Theme compatibility (light/dark)

---

## Architecture

### Pattern: Focus Glow Effect (from Input)

```tsx
// Track focus state
const [isFocused, setIsFocused] = useState(false);

// Apply conditional classes
className={cn(
  baseClasses,
  isFocused && 'shadow-[0_0_15px_rgba(20,184,166,0.15)] border-aqua-500/50'
)}

// Blur background effect
{isFocused && (
  <div className="absolute inset-0 -z-10 rounded-md bg-aqua-500/5 blur-xl pointer-events-none" />
)}
```

---

## Related Code Files

### Files to Modify

| File | Change |
|------|--------|
| `apps/dashboard/src/components/ui/textarea.tsx` | Add focus glow effect |
| `apps/dashboard/src/components/ui/select.tsx` | Add focus glow + glass styling |
| `apps/dashboard/src/components/ui/card.tsx` | Add new hover variants |
| `apps/dashboard/src/components/ui/badge.tsx` | Add glow variants |
| `apps/dashboard/src/components/ui/progress.tsx` | Add animated gradient option |

### No New Files Required

---

## Implementation Steps

### 1. Enhance Textarea Component

- [ ] Add `'use client'` directive if missing
- [ ] Add React state for focus tracking
- [ ] Wrap textarea in relative container
- [ ] Apply focus glow shadow conditionally
- [ ] Add blur background effect on focus
- [ ] Add transition-all duration-200

**Before:**
```tsx
<textarea className={cn(baseClasses, className)} />
```

**After:**
```tsx
<div className="relative">
  <textarea
    className={cn(
      baseClasses,
      'transition-all duration-200',
      isFocused && 'shadow-[0_0_15px_rgba(20,184,166,0.15)] border-aqua-500/50',
      className
    )}
    onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
    onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
  />
  {isFocused && (
    <div className="absolute inset-0 -z-10 rounded-md bg-aqua-500/5 blur-xl pointer-events-none" />
  )}
</div>
```

### 2. Enhance Select Component

- [ ] Add focus glow to SelectTrigger
- [ ] Add glass effect to SelectContent
- [ ] Add hover highlight to SelectItem
- [ ] Add subtle animation to dropdown open/close

**SelectTrigger enhancement:**
```tsx
className={cn(
  'transition-all duration-200 focus:shadow-[0_0_15px_rgba(20,184,166,0.15)] focus:border-aqua-500/50',
  className
)}
```

**SelectContent enhancement:**
```tsx
className={cn(
  'backdrop-blur-xl bg-popover/95 border-white/10',
  className
)}
```

### 3. Add Card Hover Variants

- [ ] Add `glowHover` variant with aqua glow on hover
- [ ] Add `liftHover` variant with Y translate
- [ ] Ensure existing variants unchanged

**New variants:**
```tsx
glowHover: 'bg-card shadow-sm transition-all hover:shadow-[0_0_20px_rgba(20,184,166,0.15)] hover:border-aqua-500/30',
liftHover: 'bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg',
```

### 4. Add Badge Glow Variants

- [ ] Add `glowAqua`, `glowGreen`, `glowRed` variants
- [ ] Use existing glow colors from design tokens

**New variants:**
```tsx
glowAqua: 'bg-aqua-500/20 text-aqua-400 border-aqua-500/30 shadow-[0_0_10px_rgba(20,184,166,0.2)]',
glowGreen: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
glowRed: 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
```

### 5. Enhance Progress Component

- [ ] Add animated gradient option via prop
- [ ] Add glow effect option

**Enhancement:**
```tsx
interface ProgressProps {
  animated?: boolean;
  glow?: boolean;
}

// In indicator
className={cn(
  'h-full bg-gradient-to-r from-cyan-500 to-blue-500',
  animated && 'animate-gradient-x bg-[length:200%_100%]',
  glow && 'shadow-[0_0_10px_rgba(6,182,212,0.5)]'
)}
```

---

## Todo List

- [ ] Textarea: Add focus glow effect
- [ ] Textarea: Add blur background on focus
- [ ] Select: Add focus glow to trigger
- [ ] Select: Add glass effect to content
- [ ] Select: Add hover states to items
- [ ] Card: Add glowHover variant
- [ ] Card: Add liftHover variant
- [ ] Badge: Add glow variants (aqua, green, red)
- [ ] Progress: Add animated gradient option
- [ ] Progress: Add glow effect option
- [ ] Test all components in light mode
- [ ] Test all components in dark mode
- [ ] Verify no accessibility regressions

---

## Success Criteria

1. Textarea has matching focus glow to Input
2. Select dropdown has glass effect with blur
3. Cards have interactive hover variants available
4. Badges can display status with subtle glow
5. Progress bar supports animated gradient
6. All changes work in both themes
7. Focus rings remain visible for keyboard navigation

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking existing component usage | Medium | Low | Changes are additive, new variants |
| Focus state not triggering | Low | Low | Use onFocus/onBlur handlers |
| Theme colors mismatch | Medium | Low | Use design tokens |

---

## Security Considerations

N/A - UI-only changes with no data handling.

---

## Next Steps

After completion, proceed to [Phase 2: Animation Refinement](./phase-02-animation-refinement.md)
