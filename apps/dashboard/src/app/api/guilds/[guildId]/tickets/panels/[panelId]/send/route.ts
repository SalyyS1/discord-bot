import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

// POST - Send panel to channel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; panelId: string }> }
) {
  const { guildId, panelId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const body = await request.json();
    const { channelId } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Get the panel with categories
    const panel = await prisma.ticketPanel.findUnique({
      where: { id: panelId, guildId },
      include: {
        categories: {
          where: { enabled: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!panel) {
      return NextResponse.json({ error: 'Panel not found' }, { status: 404 });
    }

    if (panel.categories.length === 0) {
      return NextResponse.json({ error: 'Panel must have at least one category' }, { status: 400 });
    }

    // Publish to Redis for bot to handle
    const panelData = {
      type: 'ticket_panel_v2',
      guildId,
      channelId,
      panelId: panel.id,
      embed: {
        title: panel.title,
        description: panel.description,
        color: panel.color,
        imageUrl: panel.imageUrl,
        thumbnail: panel.thumbnail,
        footer: panel.footer,
      },
      componentType: panel.componentType,
      buttonStyle: panel.buttonStyle,
      selectPlaceholder: panel.selectPlaceholder,
      categories: panel.categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        emoji: cat.emoji,
        description: cat.description,
        pingRoleIds: cat.pingRoleIds,
        formEnabled: cat.formEnabled,
        claimEnabled: cat.claimEnabled,
      })),
      timestamp: Date.now(),
    };

    await redis.publish('dashboard:commands', JSON.stringify(panelData));

    // Update panel with channel ID
    await prisma.ticketPanel.update({
      where: { id: panelId },
      data: { channelId },
    });

    return ApiResponse.success({ message: 'Panel sent successfully!' });
  } catch (error) {
    logger.error(`Failed to send panel: ${error}`);
    return ApiResponse.serverError();
  }
}
