# Phase 03: Stats Enhancement

**Effort:** 1h | **Priority:** MEDIUM | **Status:** Complete

## Overview

Enhance the stats API to fetch real Discord member counts instead of only showing tracked members from the database. Add distinction between "Total Members" (Discord) and "Tracked Members" (DB).

## Requirements

- [ ] Fetch actual member count from Discord API
- [ ] Distinguish "Total Members" vs "Tracked Members"
- [ ] Add online member count (if available)
- [ ] Cache Discord stats (5 min TTL)
- [ ] Graceful fallback if Discord API fails

## Related Files

| File                                                         | Action                |
| ------------------------------------------------------------ | --------------------- |
| `apps/dashboard/src/app/api/guilds/[guildId]/stats/route.ts` | Modify                |
| `apps/dashboard/src/lib/discord.ts`                          | Use `getGuild` method |

## Current Behavior

```typescript
// Current: Only counts DB members
prisma.member.count({ where: { guildId } }); // Returns: 50 (tracked)
// Actual Discord members might be: 1,000
```

## Proposed Behavior

```typescript
// New: Fetch from Discord + DB
const discordGuild = await discordService.getGuild(guildId, botToken);
const trackedMembers = await prisma.member.count({ where: { guildId } });

return {
  members: {
    total: discordGuild.approximate_member_count, // 1,000
    online: discordGuild.approximate_presence_count, // 350
    tracked: trackedMembers, // 50
  },
};
```

## Implementation Steps

### Step 1: Add getGuild to discord service

Already added in Phase 01. Verify it includes `with_counts=true` query param.

```typescript
// lib/discord.ts
getGuild: async (guildId: string, botToken?: string) => {
  return fetchDiscord(`/guilds/${guildId}?with_counts=true`, { botToken });
};
```

### Step 2: Update stats route

**File:** `apps/dashboard/src/app/api/guilds/[guildId]/stats/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { discordService, DiscordApiError } from '@/lib/discord';
import { getGuildBotToken } from '@/lib/tenant-token';
import { logger } from '@/lib/logger';

// Discord guild data type
interface DiscordGuildData {
  id: string;
  name: string;
  icon: string | null;
  approximate_member_count?: number;
  approximate_presence_count?: number;
}

export async function GET(request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  try {
    // Fetch Discord data and DB data in parallel
    const [discordData, dbStats] = await Promise.all([
      fetchDiscordGuildData(guildId),
      fetchDatabaseStats(guildId),
    ]);

    if (!dbStats.guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          guild: {
            id: dbStats.guild.id,
            name: discordData?.name || dbStats.guild.name,
            icon: discordData?.icon,
            joinedAt: dbStats.guild.joinedAt,
          },
          stats: {
            members: {
              total: discordData?.approximate_member_count || null,
              online: discordData?.approximate_presence_count || null,
              tracked: dbStats.memberCount,
            },
            tickets: {
              total: dbStats.ticketCount,
              open: dbStats.openTickets,
            },
            giveaways: {
              total: dbStats.giveawayCount,
              active: dbStats.activeGiveaways,
            },
            warnings: dbStats.warningCount,
            autoresponders: dbStats.autoresponderCount,
            levelRoles: dbStats.levelRoleCount,
            messages: dbStats.messageStats._sum.totalMessages || 0,
          },
          // Leveling stats
          totalMembers: discordData?.approximate_member_count || dbStats.memberCount,
          trackedMembers: dbStats.memberCount,
          onlineMembers: discordData?.approximate_presence_count || null,
          totalXp: dbStats.totalXp._sum.xp || 0,
          totalMessages: dbStats.messageStats._sum.totalMessages || 0,
          avgLevel: Math.round((dbStats.avgLevel._avg.level || 0) * 10) / 10,
          topLevel: dbStats.topLevel._max.level || 0,
          activeToday: dbStats.todayActivity,
          features: {
            levelingEnabled: dbStats.guild.settings?.levelingEnabled ?? false,
            antiSpamEnabled: dbStats.guild.settings?.antiSpamEnabled ?? false,
            antiLinkEnabled: dbStats.guild.settings?.antiLinkEnabled ?? false,
          },
          leaderboard: dbStats.topMembers.map((m) => ({
            discordId: m.discordId,
            // Use stored username or fallback
            nodeName: `User#${m.discordId.slice(-4)}`,
            xp: m.xp,
            level: m.level,
          })),
          levelDistribution: dbStats.levelStats.map((s) => ({
            level: s.level,
            count: s._count.level,
          })),
          recentActivity: dbStats.recentActivity.map((log) => ({
            id: log.id,
            action: log.action,
            reason: log.reason,
            time: log.createdAt,
          })),
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    logger.error(`Failed to fetch guild stats: ${error}`);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}

/**
 * Fetch guild data from Discord API
 * Returns null if bot doesn't have access
 */
async function fetchDiscordGuildData(guildId: string): Promise<DiscordGuildData | null> {
  try {
    const botToken = await getGuildBotToken(guildId);
    if (!botToken) return null;

    const guild = await discordService.getGuild(guildId, botToken);
    return guild;
  } catch (error) {
    if (error instanceof DiscordApiError) {
      if (error.isForbidden()) {
        logger.warn(`Bot lacks access to guild ${guildId} for stats`);
        return null;
      }
    }
    logger.error(`Failed to fetch Discord data for guild ${guildId}: ${error}`);
    return null;
  }
}

/**
 * Fetch all database stats (existing logic extracted)
 */
async function fetchDatabaseStats(guildId: string) {
  const [
    guild,
    memberCount,
    ticketCount,
    openTickets,
    giveawayCount,
    activeGiveaways,
    warningCount,
    autoresponderCount,
    levelRoleCount,
    messageStats,
    topMembers,
    recentActivity,
    totalXp,
    avgLevel,
    topLevel,
    todayActivity,
    levelStats,
  ] = await Promise.all([
    prisma.guild.findUnique({
      where: { id: guildId },
      include: { settings: true },
    }),
    prisma.member.count({ where: { guildId } }),
    prisma.ticket.count({ where: { guildId } }),
    prisma.ticket.count({ where: { guildId, status: 'OPEN' } }),
    prisma.giveaway.count({ where: { guildId } }),
    prisma.giveaway.count({ where: { guildId, status: 'ACTIVE' } }),
    prisma.warning.count({ where: { guildId } }),
    prisma.autoResponder.count({ where: { guildId } }),
    prisma.levelRole.count({ where: { guildId } }),
    prisma.member.aggregate({
      where: { guildId },
      _sum: { totalMessages: true },
    }),
    prisma.member.findMany({
      where: { guildId },
      orderBy: { xp: 'desc' },
      take: 10,
      select: { discordId: true, xp: true, level: true },
    }),
    prisma.modLog.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, action: true, reason: true, createdAt: true },
    }),
    prisma.member.aggregate({
      where: { guildId },
      _sum: { xp: true },
    }),
    prisma.member.aggregate({
      where: { guildId },
      _avg: { level: true },
    }),
    prisma.member.aggregate({
      where: { guildId },
      _max: { level: true },
    }),
    prisma.member.count({
      where: {
        guildId,
        lastXpGain: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.member.groupBy({
      by: ['level'],
      where: { guildId },
      _count: { level: true },
      orderBy: { level: 'desc' },
      take: 10,
    }),
  ]);

  return {
    guild,
    memberCount,
    ticketCount,
    openTickets,
    giveawayCount,
    activeGiveaways,
    warningCount,
    autoresponderCount,
    levelRoleCount,
    messageStats,
    topMembers,
    recentActivity,
    totalXp,
    avgLevel,
    topLevel,
    todayActivity,
    levelStats,
  };
}
```

### Step 3: Update dashboard UI (optional)

The frontend should now display:

- **Total Members:** 1,000 (from Discord)
- **Online:** 350 (from Discord)
- **Tracked:** 50 (from DB)

This is a frontend change that can be done in a follow-up task.

## Todo List

- [ ] Add `getGuild` method to discordService (Phase 01)
- [ ] Update stats route to fetch Discord data
- [ ] Handle Discord API failures gracefully
- [ ] Add 60s cache headers
- [ ] Update frontend to show new member stats
- [ ] Test with guilds where bot has/lacks access

## Success Criteria

- [ ] Stats show actual Discord member count
- [ ] Online member count displayed when available
- [ ] Clear distinction between total/tracked members
- [ ] Works gracefully when Discord API fails

## Discord API Response

```json
// GET /guilds/{id}?with_counts=true
{
  "id": "123456789",
  "name": "My Server",
  "icon": "abc123",
  "approximate_member_count": 1000,
  "approximate_presence_count": 350
}
```

## Risk Assessment

| Risk                   | Likelihood | Impact | Mitigation                          |
| ---------------------- | ---------- | ------ | ----------------------------------- |
| Discord API slow       | Low        | Low    | Parallel fetch, fallback to DB only |
| Member count stale     | Medium     | Low    | 60s cache is acceptable             |
| Bot lacks guild access | Medium     | Low    | Graceful null handling              |

## Notes

- `approximate_member_count` requires `GUILD_MEMBERS` intent
- Consider adding a "Last synced" timestamp in UI
- Could add a "Refresh" button to force-fetch new data
