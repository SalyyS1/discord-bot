import { NextRequest } from 'next/server';
import { prisma, Prisma } from '@repo/database';
import { z } from 'zod';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

// Max export limit to prevent timeouts
const MAX_EXPORT_LIMIT = 1000;

// CSV injection protection - prefix dangerous characters
function escapeCsvValue(value: string): string {
  const escaped = value.replace(/"/g, '""');
  // Prefix with single quote if starts with dangerous formula characters
  if (/^[=+\-@\t\r]/.test(escaped)) {
    return `"'${escaped}"`;
  }
  return `"${escaped}"`;
}

// Validate query params
const querySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  status: z.enum(['ACTIVE', 'ENDED', 'CANCELLED', 'PENDING']).optional(),
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
    format: searchParams.get('format') || 'csv',
    status: searchParams.get('status') || undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    search: searchParams.get('search') || undefined,
  });

  if (!queryResult.success) {
    return ApiResponse.error('Invalid query parameters', 400);
  }

  const { format, status, startDate, endDate, search } = queryResult.data;

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

    // Get giveaways with export limit
    const giveaways = await prisma.giveaway.findMany({
      where,
      include: {
        _count: {
          select: { entryList: true },
        },
        winners: true,
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_LIMIT,
    });

    if (format === 'json') {
      // JSON export
      const jsonData = giveaways.map((g) => ({
        id: g.id,
        prize: g.prize,
        winnerCount: g.winnerCount,
        entries: g._count.entryList,
        status: g.status,
        createdAt: g.createdAt.toISOString(),
        endedAt: g.endsAt.toISOString(),
        winners: g.winners.map((w) => w.userId).join(', '),
      }));

      return new Response(JSON.stringify(jsonData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="giveaways-${guildId}-${Date.now()}.json"`,
        },
      });
    } else {
      // CSV export with injection protection
      const csvRows = [
        'id,prize,winnerCount,entries,status,createdAt,endedAt,winners',
        ...giveaways.map((g) => {
          const winners = g.winners.map((w) => w.userId).join(';');
          return [
            g.id,
            escapeCsvValue(g.prize),
            g.winnerCount,
            g._count.entryList,
            g.status,
            g.createdAt.toISOString(),
            g.endsAt.toISOString(),
            escapeCsvValue(winners),
          ].join(',');
        }),
      ];

      const csv = csvRows.join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="giveaways-${guildId}-${Date.now()}.csv"`,
        },
      });
    }
  } catch (error) {
    logger.error(`Error exporting giveaways: ${error}`);
    return ApiResponse.serverError();
  }
}
