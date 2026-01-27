---
title: 'Dashboard UX Fixes'
description: 'Fix navigation bugs, unknown usernames, member count inaccuracies, and loading states'
status: completed
priority: P1
effort: 6h
branch: main
tags: [dashboard, ux, bug-fix, performance]
created: 2026-01-27
---

# Dashboard UX Fixes

## Problem Summary

5 critical UX issues impacting dashboard usability:

1. Profile/Settings navigation both point to same page
2. Leaderboard shows "Unknown" instead of usernames
3. Member count shows tracked members, not actual Discord count
4. Autoresponder page has slow waterfall loading
5. Settings page uses static/fake data

## Research Completed

- [UX Patterns Research](research/researcher-01-ux-patterns.md)
- [Discord Dashboard Patterns](research/researcher-02-discord-dashboard.md)
- [Dashboard Issues Scout](scout/scout-01-dashboard-issues.md)

## Implementation Phases

| Phase                                        | Focus                            | Effort | Priority |
| -------------------------------------------- | -------------------------------- | ------ | -------- |
| [Phase 01](phase-01-quick-wins.md)           | Profile nav + Member count label | 30min  | HIGH     |
| [Phase 02](phase-02-username-resolution.md)  | Schema + API username storage    | 2h     | HIGH     |
| [Phase 03](phase-03-loading-states.md)       | Skeletons + TanStack Query hooks | 2h     | MEDIUM   |
| [Phase 04](phase-04-settings-enhancement.md) | Real APIs + persistence          | 1.5h   | MEDIUM   |

## Key Files

```
apps/dashboard/src/
├── components/user-dropdown.tsx          # Issue 1: Nav fix
├── app/api/guilds/[guildId]/stats/route.ts  # Issues 2,3: API fixes
├── app/[locale]/(dashboard)/dashboard/
│   ├── page.tsx                          # Issue 3: Display fix
│   ├── autoresponder/page.tsx            # Issue 4: Loading states
│   └── settings/page.tsx                 # Issue 5: Real APIs
packages/database/prisma/schema.prisma    # Issue 2: Add username field
```

## Success Criteria

- [x] Profile link navigates to /profile
- [x] Leaderboard shows usernames (not "Unknown")
- [x] Member count labeled "Tracked Members" or fetched from Discord
- [x] Autoresponder page shows skeletons during load
- [x] Settings toggles persist to database

## Dependencies

- Prisma migration for username field (Phase 02)
- No external API dependencies

## Risks

| Risk                               | Mitigation                              |
| ---------------------------------- | --------------------------------------- |
| Stale usernames after user changes | Accept staleness; update on XP gain     |
| Migration on production DB         | Safe additive migration; nullable field |

## Next Steps

1. Start with Phase 01 (immediate 5-min fixes)
2. Phase 02 requires DB migration - coordinate with deployment
3. Phases 03-04 can proceed independently

---

_Plan created: 2026-01-27_
