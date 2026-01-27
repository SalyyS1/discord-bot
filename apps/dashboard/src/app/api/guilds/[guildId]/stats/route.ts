import { NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { logger } from '@/lib/logger';

export async function GET(request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  try {
    // Get guild with basic info
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        settings: true,
      },
    });

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    // Get all stats in parallel
    const [
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
    ] = await Promise.all([
      // Member count for this guild
      prisma.member.count({ where: { guildId } }),

      // Total tickets
      prisma.ticket.count({ where: { guildId } }),

      // Open tickets
      prisma.ticket.count({ where: { guildId, status: 'OPEN' } }),

      // Total giveaways
      prisma.giveaway.count({ where: { guildId } }),

      // Active giveaways
      prisma.giveaway.count({ where: { guildId, status: 'ACTIVE' } }),

      // Total warnings
      prisma.warning.count({ where: { guildId } }),

      // Autoresponder count
      prisma.autoResponder.count({ where: { guildId } }),

      // Level roles count
      prisma.levelRole.count({ where: { guildId } }),

      // Message count from members
      prisma.member.aggregate({
        where: { guildId },
        _sum: { totalMessages: true },
      }),

      // Top 10 members by XP
      prisma.member.findMany({
        where: { guildId },
        orderBy: { xp: 'desc' },
        take: 10,
        select: {
          discordId: true,
          username: true,
          xp: true,
          level: true,
        },
      }),

      // Recent mod logs
      prisma.modLog.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          action: true,
          reason: true,
          createdAt: true,
        },
      }),

      // Total XP in guild
      prisma.member.aggregate({
        where: { guildId },
        _sum: { xp: true },
      }),

      // Average level
      prisma.member.aggregate({
        where: { guildId },
        _avg: { level: true },
      }),

      // Top level
      prisma.member.aggregate({
        where: { guildId },
        _max: { level: true },
      }),

      // Today's active members (who gained XP today)
      prisma.member.count({
        where: {
          guildId,
          lastXpGain: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    // Level distribution
    const levelStats = await prisma.member.groupBy({
      by: ['level'],
      where: { guildId },
      _count: { level: true },
      orderBy: { level: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        guild: {
          id: guild.id,
          name: guild.name,
          joinedAt: guild.joinedAt,
        },
        stats: {
          members: memberCount,
          tickets: {
            total: ticketCount,
            open: openTickets,
          },
          giveaways: {
            total: giveawayCount,
            active: activeGiveaways,
          },
          warnings: warningCount,
          autoresponders: autoresponderCount,
          levelRoles: levelRoleCount,
          messages: messageStats._sum.totalMessages || 0,
        },
        // Leveling specific stats
        totalMembers: memberCount,
        totalXp: totalXp._sum.xp || 0,
        totalMessages: messageStats._sum.totalMessages || 0,
        avgLevel: Math.round((avgLevel._avg.level || 0) * 10) / 10,
        topLevel: topLevel._max.level || 0,
        activeToday: todayActivity,
        features: {
          levelingEnabled: guild.settings?.levelingEnabled ?? false,
          antiSpamEnabled: guild.settings?.antiSpamEnabled ?? false,
          antiLinkEnabled: guild.settings?.antiLinkEnabled ?? false,
        },
        leaderboard: topMembers.map((m) => ({
          discordId: m.discordId,
          nodeName: m.username || `User#${m.discordId.slice(-4)}`,
          xp: m.xp,
          level: m.level,
        })),
        levelDistribution: levelStats.map((s) => ({
          level: s.level,
          count: s._count.level,
        })),
        recentActivity: recentActivity.map((log) => ({
          id: log.id,
          action: log.action,
          reason: log.reason,
          time: log.createdAt,
        })),
      },
    });
  } catch (error) {
    logger.error(`Failed to fetch guild stats: ${error}`);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
