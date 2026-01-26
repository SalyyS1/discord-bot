import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

// Validate status query param with Zod
const statusSchema = z.enum(['ACTIVE', 'ENDED', 'CANCELLED']).optional();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const { searchParams } = new URL(request.url);

  // Safely validate status param
  const statusParam = searchParams.get('status');
  const statusResult = statusSchema.safeParse(statusParam || undefined);
  const status = statusResult.success ? statusResult.data : undefined;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const giveaways = await prisma.giveaway.findMany({
      where: {
        guildId,
        ...(status ? { status } : {}),
      },
      include: {
        _count: {
          select: { entryList: true },
        },
        winners: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return ApiResponse.success(giveaways);
  } catch (error) {
    logger.error(`Error fetching giveaways: ${error}`);
    return ApiResponse.serverError();
  }
}
