import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { env } from '@repo/config';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; ticketId: string }> }
) {
  const { guildId, ticketId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const body = await request.json();
    const { reason } = body;

    // Find the ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        guildId,
        status: { in: ['OPEN', 'CLAIMED'] },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found or already closed' }, { status: 404 });
    }

    // Update ticket status in database
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    // Try to notify bot to delete the channel (optional - don't fail if bot is unavailable)
    try {
      const botApiUrl = env.BOT_API_URL || 'http://localhost:3000';
      await fetch(`${botApiUrl}/api/tickets/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.BOT_API_SECRET || 'internal-secret'}`,
        },
        body: JSON.stringify({
          guildId,
          channelId: ticket.channelId,
          reason: reason || 'Closed via dashboard',
        }),
      });
    } catch {
      // Bot might be offline, ticket is still marked as closed
      logger.debug('Could not notify bot about ticket closure');
    }

    return ApiResponse.success({ message: 'Ticket closed successfully' });
  } catch (error) {
    logger.error(`Error closing ticket: ${error}`);
    return ApiResponse.serverError();
  }
}
