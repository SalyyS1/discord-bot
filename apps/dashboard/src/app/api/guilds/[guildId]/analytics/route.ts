/**
 * Analytics API
 * GET - Get analytics data for a guild
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

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

    // Get current member count from latest stats or guild
    const latestStats = stats[stats.length - 1];
    const currentMembers = latestStats?.memberCount || 0;

    // Calculate aggregates
    const totalJoined = stats.reduce((sum, s) => sum + s.membersJoined, 0);
    const totalLeft = stats.reduce((sum, s) => sum + s.membersLeft, 0);
    const totalMessages = stats.reduce((sum, s) => sum + s.messageCount, 0);
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

    // Feature usage (counts of different activities)
    const featureUsage = [
      { name: 'Messages', value: totalMessages },
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
      totalMessages,
      totalTickets,
      avgRating: ticketRatings._avg.stars
        ? Math.round(ticketRatings._avg.stars * 10) / 10
        : null,
      activeGiveaways,

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
    });
  } catch (error) {
    logger.error(`Error fetching analytics: ${error}`);
    return ApiResponse.serverError();
  }
}
