/**
 * Analytics API
 * GET - Get analytics data for a guild
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';
import { discordService } from '@/lib/discord';
import { getGuildBotToken } from '@/lib/tenant-token';

// Query params schema
const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  period: z.enum(['7d', '30d', '90d']).default('30d'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = querySchema.safeParse(searchParams);

    if (!query.success) {
      return ApiResponse.badRequest(query.error.errors.map(e => e.message).join(', '));
    }

    // Calculate date range
    const now = new Date();
    const periodDays = query.data.period === '7d' ? 7 : query.data.period === '30d' ? 30 : 90;
    const from = query.data.from ? new Date(query.data.from) : new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const to = query.data.to ? new Date(query.data.to) : now;

    // Fetch guild settings for feature states
    const guildSettings = await prisma.guildSettings.findUnique({
      where: { guildId },
      select: {
        levelingEnabled: true,
        antiSpamEnabled: true,
        antiLinkEnabled: true,
      },
    });

    // Fetch accurate member count from Discord API
    let currentMembers = 0;
    try {
      const botToken = await getGuildBotToken(guildId);
      if (botToken) {
        const guild = await discordService.getGuild(guildId, botToken);
        currentMembers = guild.approximate_member_count || 0;
      }
    } catch (error) {
      logger.warn(`Failed to fetch Discord member count for guild ${guildId}, falling back to DB`);
    }

    // Fetch stats for the period
    const stats = await prisma.guildStats.findMany({
      where: {
        guildId,
        date: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Fallback to latest stats if Discord API failed
    const latestStats = stats[stats.length - 1];
    if (currentMembers === 0) {
      currentMembers = latestStats?.memberCount || 0;
    }

    // Calculate aggregates (excluding totalMessages - removed per requirements)
    const totalJoined = stats.reduce((sum, s) => sum + s.membersJoined, 0);
    const totalLeft = stats.reduce((sum, s) => sum + s.membersLeft, 0);
    const totalTickets = stats.reduce((sum, s) => sum + s.ticketCount, 0);

    // Calculate period change
    const firstStats = stats[0];
    const memberChange = firstStats ? currentMembers - firstStats.memberCount : 0;

    // Member growth trend data
    const memberGrowth = stats.map(s => ({
      date: s.date.toISOString().split('T')[0],
      members: s.memberCount,
      joined: s.membersJoined,
      left: s.membersLeft,
    }));

    // Ticket volume trend
    const ticketVolume = stats.map(s => ({
      date: s.date.toISOString().split('T')[0],
      opened: s.ticketCount,
    }));

    // Get ticket ratings average
    const ticketRatings = await prisma.ticketRating.aggregate({
      where: {
        ticket: { guildId },
        createdAt: { gte: from, lte: to },
      },
      _avg: { stars: true },
      _count: true,
    });

    // Get active giveaways count
    const activeGiveaways = await prisma.giveaway.count({
      where: {
        guildId,
        status: 'ACTIVE',
      },
    });

    // Get leveling stats
    const levelingStats = await prisma.member.aggregate({
      where: { guildId },
      _sum: { xp: true, totalMessages: true },
      _avg: { level: true },
      _count: true,
    });

    // Get top 10 members for leaderboard
    const topMembers = await prisma.member.findMany({
      where: { guildId },
      orderBy: { xp: 'desc' },
      take: 10,
      select: {
        discordId: true,
        username: true,
        xp: true,
        level: true,
      },
    });

    // Get level distribution
    const levelDistribution = await prisma.member.groupBy({
      by: ['level'],
      where: { guildId },
      _count: { level: true },
      orderBy: { level: 'asc' },
    });

    // Get recent moderation actions (last 10)
    const recentModeration = await prisma.modLog.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        action: true,
        targetId: true,
        moderatorId: true,
        reason: true,
        createdAt: true,
      },
    });

    // Feature usage (removed Messages per requirements)
    const featureUsage = [
      { name: 'Tickets', value: totalTickets },
      { name: 'Giveaways', value: activeGiveaways },
      { name: 'Level Ups', value: levelingStats._count || 0 },
    ];

    return ApiResponse.success({
      period: query.data.period,
      from: from.toISOString(),
      to: to.toISOString(),

      // Key metrics
      currentMembers,
      memberChange,
      memberChangePercent: firstStats?.memberCount
        ? ((memberChange / firstStats.memberCount) * 100).toFixed(1)
        : '0',
      totalTickets,
      avgRating: ticketRatings._avg.stars
        ? Math.round(ticketRatings._avg.stars * 10) / 10
        : null,
      activeGiveaways,

      // Feature states (from guild settings)
      features: {
        levelingEnabled: guildSettings?.levelingEnabled ?? false,
        antiSpamEnabled: guildSettings?.antiSpamEnabled ?? false,
        antiLinkEnabled: guildSettings?.antiLinkEnabled ?? false,
      },

      // Trends
      memberGrowth,
      ticketVolume,
      featureUsage,

      // Leveling stats
      leveling: {
        totalXP: levelingStats._sum.xp || 0,
        avgLevel: levelingStats._avg.level
          ? Math.round(levelingStats._avg.level * 10) / 10
          : 0,
        activeMembers: levelingStats._count,
      },

      // Top members leaderboard
      topMembers: topMembers.map(m => ({
        discordId: m.discordId,
        username: m.username || `User#${m.discordId.slice(-4)}`,
        xp: m.xp,
        level: m.level,
      })),

      // Level distribution
      levelDistribution: levelDistribution.map(l => ({
        level: l.level,
        count: l._count.level,
      })),

      // Recent moderation
      recentModeration: recentModeration.map(log => ({
        id: log.id,
        action: log.action,
        targetId: log.targetId,
        moderatorId: log.moderatorId,
        reason: log.reason,
        timestamp: log.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error(`Error fetching analytics: ${error}`);
    return ApiResponse.serverError();
  }
}
