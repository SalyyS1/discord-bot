---
stage: "1"
title: "Stability"
goal: "It works correctly"
status: pending
priority: P1
effort: 4h
timeline: Week 1
---

# Stage 1: Stability

**Parent**: [roadmap.md](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/roadmap.md)

## Goal

Ensure the system works correctly under all conditions:
- Guild switch shows correct data
- PM2 restart preserves settings
- Redis failure doesn't break bot

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1.1 | [Query Key Discipline](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-1-stability/phase-01-query-keys.md) | 1h | ⬜ |
| 1.2 | [Cache Rules](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-1-stability/phase-02-cache-rules.md) | 1.5h | ⬜ |
| 1.3 | [Pub/Sub Sync](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-1-stability/phase-03-pubsub.md) | 1h | ⬜ |
| 1.4 | [Rebrand](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-1-stability/phase-04-rebrand.md) | 0.5h | ⬜ |

## Explicit Non-Goals

- ❌ UI redesign
- ❌ New features
- ❌ Loading overlay redesign
- ❌ Unsaved changes warning
- ❌ Performance optimization

## Success Criteria

1. `grep -r "queryKey: \['settings'\]"` returns 0 matches (all guild-scoped)
2. Guild switch: zero stale data flash
3. PM2 restart: all settings preserved
4. Redis down: bot continues working (reads from DB)
5. "KisBot" nowhere in user-facing UI

## Key Files

### Dashboard
- `apps/dashboard/src/lib/query-keys.ts` (NEW)
- `apps/dashboard/src/components/server-selector.tsx`
- `apps/dashboard/src/hooks/use-guild-settings.ts`

### Bot
- `apps/bot/src/lib/settings.ts`
- `apps/bot/src/lib/configSync.ts`

### APIs
- `apps/dashboard/src/app/api/guilds/[guildId]/voice/route.ts`
- `apps/dashboard/src/app/api/guilds/[guildId]/tickets/settings/route.ts`

## Next Stage

After completing all phases → [Stage 2: Usability](file:///D:/Project/.2_PROJECT_BOT_DISCORD/plans/2026-01-sylabot-roadmap/stage-2-usability/overview.md)
