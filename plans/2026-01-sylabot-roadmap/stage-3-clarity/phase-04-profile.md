---
stage: "3"
phase: "04"
title: "User Profile"
status: complete
effort: 2h
---

# Phase 3.4: User Profile

**Parent**: [Stage 3 Overview](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-3-clarity/overview.md)

## Requirements

1. User profile page
2. Badge display (visual design)
3. Stats overview
4. Linked guilds list

## Profile Page Sections

### Header
- Avatar
- Username
- Member since
- Badge row

### Stats
- Total XP across servers
- Messages sent
- Voice time
- Achievements unlocked

### Linked Guilds
- Servers where user is active
- Role in each server
- Quick link to server dashboard

### Badges (Visual Only - Stage 3)
- Early Adopter
- Premium Supporter
- Veteran (1 year)
- Top Contributor

## Design

```
┌─────────────────────────────────────┐
│ 👤 Username                         │
│ ⭐ ⭐ ⭐ [badges row]                  │
├─────────────────────────────────────┤
│ Stats                               │
│ 📊 XP: 15,234  💬 Messages: 2,341   │
│ 🎤 Voice: 48h  🏆 Achievements: 12  │
├─────────────────────────────────────┤
│ Servers                             │
│ 🎮 Gaming Hub - Admin               │
│ 📚 Study Group - Moderator          │
└─────────────────────────────────────┘
```

## Files to Create

| File | Action |
|------|--------|
| `apps/dashboard/src/app/[locale]/(dashboard)/profile/page.tsx` | **NEW** |
| `apps/dashboard/src/components/profile/` | **NEW** |

## Todo

- [ ] Design profile page layout
- [ ] Create profile header component
- [ ] Create stats display
- [ ] Create linked guilds list
- [ ] Design badge visuals

## Success Criteria

- Profile page feels personal and engaging
- Stats encourage engagement
