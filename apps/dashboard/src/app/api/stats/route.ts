import { NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Get real stats from database
    const [
      totalGuilds,
      totalUsers,
      totalMessages,
      totalTickets,
      totalGiveaways,
      activeGiveaways,
      completedGiveaways,
      totalEntries,
      recentRatings,
      avgRating,
    ] = await Promise.all([
      // Count guilds (servers)
      prisma.guildSettings.count(),

      // Count unique users (from user levels)
      prisma.userLevel.count(),

      // Sum all messages from user levels
      prisma.userLevel.aggregate({
        _sum: { totalMessages: true },
      }),

      // Count total tickets
      prisma.ticket.count(),

      // Count total giveaways
      prisma.giveaway.count(),

      // Count active giveaways
      prisma.giveaway.count({
        where: { status: 'ACTIVE' },
      }),

      // Count completed giveaways
      prisma.giveaway.count({
        where: { status: 'ENDED' },
      }),

      // Sum all giveaway entries
      prisma.giveaway.aggregate({
        _sum: { entries: true },
      }),

      // Get recent ticket ratings for testimonials
      prisma.ticketRating.findMany({
        where: {
          rating: { gte: 4 },
          feedback: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          ticket: {
            select: {
              guildId: true,
            },
          },
        },
      }),

      // Calculate average rating
      prisma.ticketRating.aggregate({
        _avg: { rating: true },
      }),
    ]);

    // Get total members across all guilds (from user levels grouped by guild)
    const membersByGuild = await prisma.userLevel.groupBy({
      by: ['guildId'],
      _count: { id: true },
    });

    const totalMembers = membersByGuild.reduce((sum, g) => sum + g._count.id, 0);

    // Calculate uptime (bot has been online since deployment)
    const uptime = 99.9; // This would ideally come from a monitoring service

    // Format testimonials from real ratings
    const testimonials = recentRatings
      .filter(r => r.feedback && r.feedback.length > 20)
      .slice(0, 4)
      .map((rating, index) => ({
        id: rating.id,
        stars: rating.rating,
        review: rating.feedback || '',
        author: rating.userId.slice(0, 4) + '***',
        role: 'Server Member',
        server: `Server ${rating.ticket.guildId.slice(-4)}`,
        avatar: String.fromCharCode(65 + index),
      }));

    return NextResponse.json({
      success: true,
      data: {
        servers: totalGuilds,
        users: totalUsers,
        members: totalMembers,
        messages: totalMessages._sum.totalMessages || 0,
        tickets: totalTickets,
        giveaways: totalGiveaways,
        activeGiveaways,
        completedGiveaways,
        totalEntries: totalEntries._sum.entries || 0,
        uptime,
        responseTime: 50,
        rating: avgRating._avg.rating ? Number(avgRating._avg.rating.toFixed(1)) : 5.0,
        testimonials,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Failed to fetch stats: ${error}`);

    // Return fallback stats if database is unavailable
    return NextResponse.json({
      success: false,
      data: {
        servers: 0,
        users: 0,
        members: 0,
        messages: 0,
        tickets: 0,
        giveaways: 0,
        activeGiveaways: 0,
        completedGiveaways: 0,
        totalEntries: 0,
        uptime: 99.9,
        responseTime: 50,
        rating: 5.0,
        testimonials: [],
      },
      timestamp: new Date().toISOString(),
    });
  }
}
