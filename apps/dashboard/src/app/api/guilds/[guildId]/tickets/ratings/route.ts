/**
 * Ticket Ratings API
 * GET - List all ratings with filters
 * POST - (Bot-only) Submit a rating
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

// Query params schema
const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  minStars: z.coerce.number().min(1).max(5).optional(),
  maxStars: z.coerce.number().min(1).max(5).optional(),
  hasReview: z.enum(['true', 'false']).optional(),
  approved: z.enum(['true', 'false', 'all']).default('all'),
  staffId: z.string().optional(),
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

    const { limit, offset, minStars, maxStars, hasReview, approved, staffId } = query.data;

    // Build where clause
    const where: any = {
      ticket: { guildId },
    };

    if (minStars) where.stars = { ...where.stars, gte: minStars };
    if (maxStars) where.stars = { ...where.stars, lte: maxStars };
    if (hasReview === 'true') where.review = { not: null };
    if (hasReview === 'false') where.review = null;
    if (approved === 'true') where.approved = true;
    if (approved === 'false') where.approved = false;
    if (staffId) where.staffId = staffId;

    // Fetch ratings with pagination
    const [ratings, total] = await Promise.all([
      prisma.ticketRating.findMany({
        where,
        include: {
          ticket: {
            select: {
              id: true,
              channelId: true,
              closedAt: true,
              closedBy: true,
              claimedBy: true,
              member: {
                select: {
                  discordId: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.ticketRating.count({ where }),
    ]);

    return ApiResponse.success({
      items: ratings,
      total,
      limit,
      offset,
      hasMore: offset + ratings.length < total,
    });
  } catch (error) {
    logger.error(`Error fetching ticket ratings: ${error}`);
    return ApiResponse.serverError();
  }
}
