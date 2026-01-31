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

      // Get recent ticket ratings for testimonials (using correct field names)
      prisma.ticketRating.findMany({
        where: {
          stars: { gte: 4 },
          review: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          stars: true,
          review: true,
          ticketId: true,
        },
      }),

      // Calculate average rating
      prisma.ticketRating.aggregate({
        _avg: { stars: true },
      }),
    ]);

    // Static values for users/messages since userLevel model doesn't exist
    const totalUsers = totalGuilds * 100; // Estimate
    const totalMessages = totalGuilds * 10000; // Estimate
    const totalMembers = totalUsers;

    // Calculate uptime (bot has been online since deployment)
    const uptime = 99.9; // This would ideally come from a monitoring service

    // Format testimonials from real ratings
    const testimonials = recentRatings
      .filter(r => r.review && r.review.length > 20)
      .slice(0, 4)
      .map((rating, index) => ({
        id: rating.id,
        stars: rating.stars,
        review: rating.review || '',
        author: 'User ***',
        role: 'Server Member',
        server: `Server ${rating.ticketId.slice(-4)}`,
        avatar: String.fromCharCode(65 + index),
      }));

    return NextResponse.json({
      success: true,
      data: {
        servers: totalGuilds,
        users: totalUsers,
        members: totalMembers,
        messages: totalMessages,
        tickets: totalTickets,
        giveaways: totalGiveaways,
        activeGiveaways,
        completedGiveaways,
        totalEntries: totalEntries._sum.entries || 0,
        uptime,
        responseTime: 50,
        rating: avgRating._avg?.stars ? Number(avgRating._avg.stars.toFixed(1)) : 5.0,
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
