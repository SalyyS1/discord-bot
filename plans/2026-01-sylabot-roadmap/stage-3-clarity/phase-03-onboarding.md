---
stage: "3"
phase: "03"
title: "Onboarding"
status: complete
effort: 2h
---

# Phase 3.3: Onboarding

**Parent**: [Stage 3 Overview](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-3-clarity/overview.md)

## Requirements

1. First-time user guide
2. Quick start per feature
3. Permission explanations
4. In-dashboard help

## Implementation

### First-Login Flow

```
1. User logs in first time
2. Check if hasCompletedOnboarding = false
3. Show welcome modal with quick tour
4. Guide through: Select server → Enable a feature → Done!
5. Mark hasCompletedOnboarding = true
```

### Quick Start Cards

Each feature page shows a quick start if not configured:

```typescript
{!isConfigured && (
  <QuickStartCard
    title="Set up Tickets in 3 steps"
    steps={[
      "Create a panel",
      "Add categories", 
      "Deploy to a channel"
    ]}
  />
)}
```

### Help Links

Every settings page has:
- "Need help?" link to docs
- Tooltip explanations on complex options

## Files to Create

| File | Action |
|------|--------|
| `apps/dashboard/src/components/onboarding/` | **NEW** |
| `apps/dashboard/src/hooks/use-onboarding.ts` | **NEW** |

## Todo

- [ ] Create welcome modal
- [ ] Create quick start card component
- [ ] Add onboarding state tracking
- [ ] Add help links to feature pages

## Success Criteria

- New user completes setup in < 5 minutes
- No confusion about next steps
