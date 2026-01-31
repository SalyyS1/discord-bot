---
title: "Dashboard & Discord Bot Sync Fix"
description: "Comprehensive fix for Dashboard-Bot synchronization, UI issues, and feature enhancements"
status: pending
priority: P1
effort: 50h
branch: main
tags: [dashboard, sync, redis, selectors, mutations, music, tickets, analytics]
created: 2026-01-31
---

# Dashboard & Discord Bot Sync Fix

## Problem Summary

13 categories of issues affecting Dashboard <-> Discord synchronization and feature functionality:
- Select components (Role/Channel/Category) not loading data
- Save operations failing silently on Voice, Music, Giveaway pages
- Discord-created giveaways/tickets not appearing in Dashboard
- Music commands non-functional
- Statistics inaccurate, redundant sections
- Authentication double login bug
- Language selection not persisting
- Bot management and documentation pages broken

## Root Causes

1. **Selector Data Dependency** - Selectors fetch internally, no shared context
2. **Mutation Hook Gaps** - Voice, Music, Giveaway missing mutation hooks
3. **Redis Sync Gaps** - Missing publishers for Giveaway, Tickets, Music
4. **Music System** - Lavalink connection/command issues
5. **State Management** - Component state not resetting properly
6. **Auth Flow** - Session not persisting correctly through OAuth redirect

## Implementation Phases

| Phase | Description | Priority | Effort | Status |
|-------|-------------|----------|--------|--------|
| [Phase 1](./phase-01-guild-data-provider-and-selector-refactor.md) | GuildDataProvider + Selector Refactor | P1 | 3h | ✅ complete |
| [Phase 2](./phase-02-mutation-hooks-extension-and-save-wiring.md) | Mutation Hooks Extension + Save Wiring | P1 | 3h | ✅ complete |
| [Phase 3](./phase-03-redis-sync-publisher-additions.md) | Redis Sync Publisher Additions | P1 | 3h | ✅ complete |
| [Phase 4](./phase-04-bot-to-dashboard-event-sync.md) | Bot -> Dashboard Event Sync | P1 | 3h | ✅ complete |
| [Phase 5](./phase-05-statistics-analytics-fix.md) | Statistics & Analytics Fix | P1 | 4h | ✅ complete |
| [Phase 6](./phase-06-voice-management-enhancement.md) | Voice Management Enhancement | P2 | 3h | ✅ complete |
| [Phase 7](./phase-07-music-system-overhaul.md) | Music System Overhaul | P1 | 8h | ✅ complete |
| [Phase 8](./phase-08-ticket-system-fixes.md) | Ticket System Fixes | P1 | 4h | ✅ complete |
| [Phase 9](./phase-09-giveaway-enhancements.md) | Giveaway Enhancements | P2 | 2h | ✅ complete |
| [Phase 10](./phase-10-profile-page-enhancement.md) | Profile Page Enhancement | P2 | 4h | ✅ complete |
| [Phase 11](./phase-11-auth-i18n-fixes.md) | Authentication & i18n Fixes | P1 | 3h | ✅ complete |
| [Phase 12](./phase-12-bot-management-documentation-fixes.md) | Bot Management & Documentation | P3 | 4h | ✅ complete |
| [Phase 13](./phase-13-review-system.md) | Review System | P3 | 3h | ✅ complete |

## Dependencies

```
Phase 1 (Selectors) ─────┬───> Phase 2 (Mutations)
                         │
                         └───> Phase 3 (Redis) ───> Phase 4 (Sync)

Phase 5 (Stats) ─────────────> Independent

Phase 6 (Voice) ─────────────> Depends on Phase 1

Phase 7 (Music) ─────────────> Depends on Phase 2

Phase 8 (Tickets) ───────────> Depends on Phases 3, 4

Phase 9 (Giveaway) ──────────> Depends on Phases 3, 4

Phase 10 (Profile) ──────────> Independent

Phase 11 (Auth/i18n) ────────> Independent (CRITICAL - do early)

Phase 12 (Bots/Docs) ────────> Independent

Phase 13 (Reviews) ──────────> Independent
```

## Priority Order (Recommended)

1. **Phase 11** - Auth/i18n (blocking user experience)
2. **Phase 1** - Selectors (foundation for other fixes)
3. **Phase 2** - Mutations (enables save functionality)
4. **Phase 7** - Music (critical feature broken)
5. **Phase 5** - Analytics (inaccurate data display)
6. **Phase 3** - Redis publishers
7. **Phase 4** - Event sync
8. **Phase 8** - Tickets
9. **Phase 6** - Voice enhancements
10. **Phase 9** - Giveaway enhancements
11. **Phase 10** - Profile enhancements
12. **Phase 12** - Bot management/docs
13. **Phase 13** - Reviews

## Key Files

**Dashboard:**
- `apps/dashboard/src/context/guild-data-provider.tsx` (new)
- `apps/dashboard/src/components/selectors/*.tsx`
- `apps/dashboard/src/hooks/use-mutations.ts`
- `apps/dashboard/src/lib/configSync.ts`

**Packages:**
- `packages/config/src/sync/publisher.ts`
- `packages/config/src/sync/channels.ts`

**Bot:**
- `apps/bot/src/services/bot-redis-event-publisher.ts`
- `apps/bot/src/commands/music/*.ts`

## Success Criteria

1. All selectors load data on any dashboard page
2. Voice, Music, Giveaway save buttons work with toast feedback
3. Discord-created giveaways/tickets appear in Dashboard within 30 seconds
4. No duplicate API calls from selectors
5. All music commands functional
6. Stats display accurate member counts
7. Single login flow (no double auth)
8. Language selection persists across pages

## Validation Summary

**Validated:** 2026-01-31
**Questions asked:** 15 (7 initial + 8 extended)

### Confirmed Decisions

| Decision | User Choice |
|----------|-------------|
| GuildDataProvider scope | All dashboard pages |
| Selector context/props priority | Context-first with prop override |
| Giveaway settings endpoint | `/giveaways/settings` |
| Realtime strategy | Polling first (30s), SSE later |
| Redis publish failure handling | Silent fail + log |
| Polling interval | 30s consistent |
| CategorySelector approach | Separate component |
| **Music player backend** | **Lavalink (already configured)** |
| **Playlist storage** | **PostgreSQL (Prisma models)** |
| **Profile features scope** | **Full feature set (badges, achievements, avatar, tags, logs)** |
| **Stats data source** | **Redis cache + member join/leave events** |
| **Auth bug approach** | **Debug existing better-auth** |
| **i18n persistence** | **Cookie + profile sync when logged in** |
| **Avatar storage** | **Cloudflare R2 bucket** |
| **Review system scope** | **Full: star rating + text + moderation** |

### Action Items

- [x] Plan validated, ready for implementation
- [x] All 13 phases documented
- [x] Extended validation completed (8 additional questions)
- [x] Phase 11 (Auth/i18n) - implement first as blocking issue
- [x] Phase 1-4 (Core sync) implementation
- [x] Phase 5-8 (Critical fixes) implementation
- [x] Phase 9-13 (Enhancements) implementation
- [ ] Run database migrations (`npx prisma migrate deploy`)
- [ ] Set `ADMIN_USER_IDS` env variable for review moderation
- [ ] Deploy and test end-to-end

### Notes from Validation

- Lavalink server already running, focus on fixing connection/commands
- Full profile features approved - implement badges, achievements, avatar, tags, activity logs
- Use R2 for avatar storage (already in .env.example)
- Review system: full scope with star ratings, text reviews, admin moderation
