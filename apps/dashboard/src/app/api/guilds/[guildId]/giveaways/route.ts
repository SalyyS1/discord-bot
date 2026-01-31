import { NextRequest } from 'next/server';
import { prisma, Prisma } from '@repo/database';
import { z } from 'zod';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

// Validate status query param with Zod
const statusSchema = z.enum(['ACTIVE', 'ENDED', 'CANCELLED', 'PENDING']).optional();

// Validate query params
const querySchema = z.object({
  status: statusSchema,
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const { searchParams } = new URL(request.url);

  // Parse and validate query params
  const queryResult = querySchema.safeParse({
    status: searchParams.get('status') || undefined,
    page: searchParams.get('page') || '1',
    limit: searchParams.get('limit') || '20',
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    search: searchParams.get('search') || undefined,
  });

  if (!queryResult.success) {
    return ApiResponse.error('Invalid query parameters', 400);
  }

  const { status, page, limit, startDate, endDate, search } = queryResult.data;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    // Build where clause with proper Prisma types
    const where: Prisma.GiveawayWhereInput = {
      guildId,
      ...(status ? { status } : {}),
      ...(search ? { prize: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    // Add date range filters
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get total count
    const total = await prisma.giveaway.count({ where });

    // Get paginated giveaways
    const giveaways = await prisma.giveaway.findMany({
      where,
      include: {
        _count: {
          select: { entryList: true },
        },
        winners: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return ApiResponse.success({
      giveaways,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    logger.error(`Error fetching giveaways: ${error}`);
    return ApiResponse.serverError();
  }
}
