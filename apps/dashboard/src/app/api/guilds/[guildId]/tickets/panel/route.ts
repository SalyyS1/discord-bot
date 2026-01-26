import { NextRequest, NextResponse } from 'next/server';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const body = await request.json();
    const { channelId, embed } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Publish ticket panel request to Redis for bot to handle
    const panelData = {
      type: 'ticket_panel',
      guildId,
      channelId,
      embed: {
        title: embed?.title || '🎫 Open a Ticket',
        description: embed?.description || 'Click the button below to contact support.',
        color: embed?.color || '#14b8a6',
        imageUrl: embed?.imageUrl || null,
      },
      timestamp: Date.now(),
    };

    // Publish to bot via Redis
    await redis.publish('dashboard:commands', JSON.stringify(panelData));

    return ApiResponse.success({ message: 'Panel request sent! The bot will send the panel shortly.' });
  } catch (error) {
    logger.error(`Error sending ticket panel: ${error}`);
    return ApiResponse.serverError();
  }
}
