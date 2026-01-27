import { NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { discordService, DiscordApiError } from '@/lib/discord';
import { getGuildBotToken } from '@/lib/tenant-token';
import { logger } from '@/lib/logger';
import { validateGuildId } from '@/lib/validation';

// Discord guild data type for member counts
interface DiscordGuildData {
  id: string;
  name: string;
  icon: string | null;
  approximate_member_count?: number;
  approximate_presence_count?: number;
}

export async function GET(request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  // Validate guildId format
  const validationError = validateGuildId(guildId);
  if (validationError) return validationError;

  try {
    // Fetch Discord data and DB data in parallel with resilience
    const [discordResult, dbResult] = await Promise.allSettled([
      fetchDiscordGuildData(guildId),
      fetchDatabaseStats(guildId),
    ]);

    // Handle DB failure (critical)
    if (dbResult.status === 'rejected') {
      logger.error(`Database query failed for guild ${guildId}`, {
        error: String(dbResult.reason),
      });
      return NextResponse.json(
        { success: false, error: 'Database temporarily unavailable' },
        { status: 503 }
      );
    }

    const dbStats = dbResult.value;
    if (!dbStats.guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    // Discord data is optional - gracefully degrade
    const discordData = discordResult.status === 'fulfilled' ? discordResult.value : null;
    if (discordResult.status === 'rejected') {
      logger.warn(`Discord API failed for guild ${guildId}, using DB-only data`);
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
          // Leveling stats - use Discord count if available, fallback to tracked
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
 * Fetch guild data from Discord API.
 * Returns null if bot doesn't have access or on failure.
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
 * Fetch all database stats with resilience.
 * Critical queries fail fast, optional queries use allSettled.
 */
async function fetchDatabaseStats(guildId: string) {
  // Critical queries - must succeed
  const [guild, memberCount] = await Promise.all([
    prisma.guild.findUnique({
      where: { id: guildId },
      include: { settings: true },
    }),
    prisma.member.count({ where: { guildId } }),
  ]);

  // Optional queries - use allSettled so failures don't break response
  const optionalResults = await Promise.allSettled([
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
    prisma.member.aggregate({ where: { guildId }, _sum: { xp: true } }),
    prisma.member.aggregate({ where: { guildId }, _avg: { level: true } }),
    prisma.member.aggregate({ where: { guildId }, _max: { level: true } }),
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

  // Extract values with defaults for failed queries
  const getValue = <T>(result: PromiseSettledResult<T>, fallback: T): T =>
    result.status === 'fulfilled' ? result.value : fallback;

  return {
    guild,
    memberCount,
    ticketCount: getValue(optionalResults[0], 0),
    openTickets: getValue(optionalResults[1], 0),
    giveawayCount: getValue(optionalResults[2], 0),
    activeGiveaways: getValue(optionalResults[3], 0),
    warningCount: getValue(optionalResults[4], 0),
    autoresponderCount: getValue(optionalResults[5], 0),
    levelRoleCount: getValue(optionalResults[6], 0),
    messageStats: getValue(optionalResults[7], { _sum: { totalMessages: 0 } }),
    topMembers: getValue(optionalResults[8], []),
    recentActivity: getValue(optionalResults[9], []),
    totalXp: getValue(optionalResults[10], { _sum: { xp: 0 } }),
    avgLevel: getValue(optionalResults[11], { _avg: { level: 0 } }),
    topLevel: getValue(optionalResults[12], { _max: { level: 0 } }),
    todayActivity: getValue(optionalResults[13], 0),
    levelStats: getValue(optionalResults[14], []),
  };
}
