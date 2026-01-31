# Phase 5: Statistics & Analytics Fix

## Context Links

- [Existing Analytics Page](apps/dashboard/src/app/[locale]/(dashboard)/dashboard/analytics/page.tsx)
- [Stats API Route](apps/dashboard/src/app/api/guilds/[guildId]/analytics/route.ts)
- [Stats Card Component](apps/dashboard/src/components/analytics/stats-card.tsx)

## Overview

**Priority:** P1 - Critical
**Status:** Complete
**Effort:** 4 hours

Fix inaccurate real-time statistics, remove redundant metrics/sections, and correct state inconsistency for feature toggles.

## Key Insights

1. Analytics page fetches from `/api/guilds/${guildId}/analytics` using SWR
2. Stats show "Messages sent" metric - needs removal per requirements
3. Sections exist for Warnings, Level roles, Auto responses - marked as redundant
4. Feature toggles (Leveling/Anti-spam/Anti-link) show disabled when actually enabled
5. Top members, level distribution, recent moderation sections not populating

## Requirements

### Functional
- FR-1: Display exact member count from Discord API ✅
- FR-2: Remove "Messages sent" metric from analytics cards ✅
- FR-3: Remove redundant sections: Warnings, Level roles, Auto responses ✅
- FR-4: Feature toggle states must reflect actual database values ✅
- FR-5: Top members list must display correctly ✅
- FR-6: Level distribution chart must populate ✅
- FR-7: Recent moderation logs must display ✅

### Non-Functional
- NFR-1: Stats refresh every 60 seconds ✅
- NFR-2: Member count accurate within 5 minutes of Discord changes ✅

## Architecture

```
Analytics Data Flow:
Discord API (member count)
    |
    v
Bot -> Redis Cache (60s TTL)
    |
    v
Dashboard API Route -> Prisma (aggregated stats)
    |
    v
Analytics Page (SWR polling)
```

## Related Code Files

### Files Modified
| File | Changes |
|------|---------|
| `apps/dashboard/src/app/[locale]/(dashboard)/dashboard/analytics/page.tsx` | Removed Messages metric, cleaned layout, integrated new components |
| `apps/dashboard/src/app/api/guilds/[guildId]/analytics/route.ts` | Added Discord API member count fetch, feature states, new data endpoints |

### Files Created
| File | Purpose |
|------|---------|
| `apps/dashboard/src/components/analytics/top-members-list.tsx` | Top members leaderboard component |
| `apps/dashboard/src/components/analytics/level-distribution-chart.tsx` | Level distribution visualization |
| `apps/dashboard/src/components/analytics/recent-moderation-list.tsx` | Recent mod actions display |

## Implementation Steps

### Step 1: Fix Member Count Source (45 min) ✅

1. ✅ Update analytics API route to fetch member count from Discord API or cached Redis value
2. ✅ Add fallback to database stats if Discord API fails
3. ✅ Remove reliance on outdated database snapshots

### Step 2: Remove Redundant Metrics (30 min) ✅

1. ✅ Remove "Messages sent" metric card from analytics page
2. ✅ Remove Warnings section (not in original spec, so wasn't there)
3. ✅ Remove Level roles section (not in original spec, so wasn't there)
4. ✅ Remove Auto responses section (not in original spec, so wasn't there)

### Step 3: Fix Feature Toggle States (45 min) ✅

1. ✅ Add feature states endpoint to analytics API
2. ✅ Query guild settings for: leveling, anti-spam, anti-link enabled states
3. ✅ Return feature states in API response

### Step 4: Implement Top Members Component (45 min) ✅

1. ✅ Create `top-members-list.tsx` component
2. ✅ Query leaderboard data from database
3. ✅ Display top 10 members with XP, level, rank icons

### Step 5: Implement Level Distribution Chart (45 min) ✅

1. ✅ Create `level-distribution-chart.tsx`
2. ✅ Aggregate member levels into distribution buckets
3. ✅ Render bar chart visualization

### Step 6: Implement Recent Moderation (30 min) ✅

1. ✅ Create `recent-moderation-list.tsx` component
2. ✅ Query last 10 mod actions from moderation log
3. ✅ Display action type, target, moderator, timestamp with icons

## Todo List

- [x] Fix member count fetching from Discord/Redis
- [x] Remove "Messages sent" metric
- [x] Remove Warnings section
- [x] Remove Level roles section
- [x] Remove Auto responses section
- [x] Fix Leveling toggle state display
- [x] Fix Anti-spam toggle state display
- [x] Fix Anti-link toggle state display
- [x] Create and integrate TopMembersList component
- [x] Create and integrate LevelDistributionChart component
- [x] Create and integrate RecentModeration component
- [x] Test all analytics display correctly

## Success Criteria

1. **Accurate Count:** Member count matches Discord within 5 min ✅
2. **Clean UI:** No redundant metrics/sections visible ✅
3. **Correct States:** Feature toggles show actual DB values ✅
4. **Data Display:** Top members, distribution, moderation all populate ✅

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Discord API rate limits | Medium | Medium | Use Redis caching, 60s TTL |
| Large guild performance | Medium | Low | Paginate top members, limit queries |
| Missing historical data | Low | Low | Graceful fallback to "No data" |

## Security Considerations

- Analytics only accessible to users with MANAGE_GUILD permission
- No PII exposed in top members (use display names only)
- Mod log access gated by guild membership

## Implementation Notes

### Changes Made

1. **Analytics API Route (`route.ts`)**:
   - Added Discord API integration to fetch real-time member count
   - Added guild settings query for feature toggle states
   - Added top members query (top 10 by XP)
   - Added level distribution groupBy query
   - Added recent moderation actions query (last 10)
   - Removed totalMessages aggregation from response
   - Added graceful fallback to DB stats if Discord API fails

2. **Analytics Page (`page.tsx`)**:
   - Removed "Messages" metric card (changed grid from 4 to 3 columns)
   - Added 60-second refresh interval to SWR
   - Integrated TopMembersList component
   - Integrated LevelDistributionChart component
   - Integrated RecentModerationList component
   - Cleaned up redundant sections

3. **New Components**:
   - `top-members-list.tsx`: Shows top 10 members with rank icons, XP, and levels
   - `level-distribution-chart.tsx`: Visualizes member distribution across level ranges
   - `recent-moderation-list.tsx`: Displays recent mod actions with icons and timestamps

### Type Safety

All components are fully typed with TypeScript interfaces. No type errors detected during compilation.

## Next Steps

After this phase:
1. Phase 6 can proceed (Voice Management)
2. Dashboard overview will display accurate stats
