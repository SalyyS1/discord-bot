/**
 * Public Testimonials API
 * GET - Get approved/featured testimonials for public display
 * 
 * This endpoint can be used by the public website to display testimonials
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

// Query params schema
const querySchema = z.object({
  limit: z.coerce.number().min(1).max(20).default(10),
  featured: z.enum(['true', 'false', 'all']).default('all'),
  minStars: z.coerce.number().min(1).max(5).default(4),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    // Verify guild exists
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { id: true, name: true },
    });

    if (!guild) {
      return ApiResponse.notFound('Guild not found');
    }

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = querySchema.safeParse(searchParams);

    if (!query.success) {
      return ApiResponse.badRequest(query.error.errors.map(e => e.message).join(', '));
    }

    const { limit, featured, minStars } = query.data;

    // Build where clause - only approved testimonials with reviews
    const where: any = {
      ticket: { guildId },
      approved: true,
      review: { not: null },
      stars: { gte: minStars },
    };

    if (featured === 'true') where.featured = true;
    if (featured === 'false') where.featured = false;

    // Fetch testimonials
    const testimonials = await prisma.ticketRating.findMany({
      where,
      select: {
        id: true,
        stars: true,
        review: true,
        featured: true,
        createdAt: true,
        // Don't expose ticket details for privacy
      },
      orderBy: [
        { featured: 'desc' },
        { stars: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    return ApiResponse.success({
      guild: {
        id: guild.id,
        name: guild.name,
      },
      testimonials,
    });
  } catch (error) {
    logger.error(`Error fetching testimonials: ${error}`);
    return ApiResponse.serverError();
  }
}
