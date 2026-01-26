import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { validateGuildAccess, ensureGuildExists, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

const ticketSettingsSchema = z.object({
  ticketCategoryId: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const status = searchParams.get('status'); // Filter by status: OPEN, CLAIMED, CLOSED

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    if (type === 'settings') {
      // Get ticket settings from GuildSettings
      const settings = await prisma.guildSettings.findUnique({
        where: { guildId },
        select: { ticketCategoryId: true },
      });
      return ApiResponse.success(settings || { ticketCategoryId: null });
    }

    // Build status filter
    const statusFilter = status
      ? { status: status as 'OPEN' | 'CLAIMED' | 'CLOSED' }
      : {};

    // Get tickets list with member info
    const tickets = await prisma.ticket.findMany({
      where: {
        guildId,
        ...statusFilter,
      },
      include: {
        member: {
          select: {
            discordId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Increased limit for history
    });

    // Get stats
    const stats = await prisma.ticket.groupBy({
      by: ['status'],
      where: { guildId },
      _count: { id: true },
    });

    return ApiResponse.success({
      tickets,
      stats: stats.reduce((acc, s) => ({ ...acc, [s.status]: s._count.id }), {}),
    });
  } catch (error) {
    logger.error(`Error fetching tickets: ${error}`);
    return ApiResponse.serverError();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const body = await request.json();
    const validated = ticketSettingsSchema.parse(body);

    // Ensure guild exists before upserting settings
    await ensureGuildExists(guildId);

    const settings = await prisma.guildSettings.upsert({
      where: { guildId },
      update: validated,
      create: {
        guildId,
        ...validated,
      },
      select: { ticketCategoryId: true },
    });

    return ApiResponse.success(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    logger.error(`Error updating ticket settings: ${error}`);
    return ApiResponse.serverError();
  }
}
