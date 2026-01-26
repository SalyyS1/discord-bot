/**
 * Rating Statistics API
 * GET - Get rating statistics for the guild
 */

import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

interface StaffStat {
  staffId: string;
  ticketCount: number;
  avgRating: number;
  totalStars: number;
}

interface RatingStats {
  total: number;
  average: number;
  distribution: Record<number, number>;
  staffStats: StaffStat[];
  recentTrend: {
    period: string;
    count: number;
    average: number;
  }[];
  testimonialStats: {
    pending: number;
    approved: number;
    featured: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    // Fetch all ratings for this guild
    const ratings = await prisma.ticketRating.findMany({
      where: {
        ticket: { guildId },
      },
      select: {
        id: true,
        stars: true,
        staffId: true,
        review: true,
        approved: true,
        featured: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate distribution
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalStars = 0;

    for (const r of ratings) {
      distribution[r.stars]++;
      totalStars += r.stars;
    }

    // Calculate staff stats
    const staffMap = new Map<string, { total: number; count: number }>();
    for (const r of ratings) {
      if (r.staffId) {
        const current = staffMap.get(r.staffId) || { total: 0, count: 0 };
        current.total += r.stars;
        current.count++;
        staffMap.set(r.staffId, current);
      }
    }

    const staffStats: StaffStat[] = Array.from(staffMap.entries())
      .map(([staffId, { total, count }]) => ({
        staffId,
        ticketCount: count,
        avgRating: Math.round((total / count) * 10) / 10,
        totalStars: total,
      }))
      .sort((a, b) => b.avgRating - a.avgRating);

    // Calculate recent trend (last 7 days)
    const now = new Date();
    const recentTrend: RatingStats['recentTrend'] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayRatings = ratings.filter(r => {
        const rDate = r.createdAt.toISOString().split('T')[0];
        return rDate === dateStr;
      });

      const dayTotal = dayRatings.reduce((sum, r) => sum + r.stars, 0);

      recentTrend.push({
        period: dateStr,
        count: dayRatings.length,
        average: dayRatings.length > 0
          ? Math.round((dayTotal / dayRatings.length) * 10) / 10
          : 0,
      });
    }

    // Testimonial stats
    const testimonialStats = {
      pending: ratings.filter(r => r.review && !r.approved).length,
      approved: ratings.filter(r => r.approved).length,
      featured: ratings.filter(r => r.featured).length,
    };

    const stats: RatingStats = {
      total: ratings.length,
      average: ratings.length > 0
        ? Math.round((totalStars / ratings.length) * 10) / 10
        : 0,
      distribution,
      staffStats,
      recentTrend,
      testimonialStats,
    };

    return ApiResponse.success(stats);
  } catch (error) {
    logger.error(`Error fetching rating stats: ${error}`);
    return ApiResponse.serverError();
  }
}
