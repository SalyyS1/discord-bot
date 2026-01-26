import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        guildId,
        status: { in: ['OPEN', 'CLAIMED'] },
      },
      include: {
        member: {
          select: {
            discordId: true,
          },
        },
        ticketCategory: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Transform to expected format
    const data = tickets.map(ticket => ({
      id: ticket.id,
      number: ticket.number || 0,
      channelId: ticket.channelId,
      channelName: `ticket-${ticket.number || 0}`,
      userId: ticket.member?.discordId || 'Unknown',
      userName: `User ${ticket.member?.discordId?.slice(-4) || 'Unknown'}`,
      categoryName: ticket.ticketCategory?.name,
      createdAt: ticket.createdAt.toISOString(),
      subject: ticket.subject || undefined,
      claimedBy: ticket.claimedBy || undefined,
    }));

    return ApiResponse.success(data);
  } catch (error) {
    logger.error(`Error fetching open tickets: ${error}`);
    return ApiResponse.serverError();
  }
}
