import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

// GET - List all panels
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const panels = await prisma.ticketPanel.findMany({
      where: { guildId },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return ApiResponse.success(panels);
  } catch (error) {
    logger.error(`Failed to fetch panels: ${error}`);
    return ApiResponse.serverError();
  }
}

// POST - Create panel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const body = await request.json();
    const { name, title, description, color, imageUrl, thumbnail, footer, componentType, buttonStyle, selectPlaceholder, enabled } = body;

    if (!name || !title) {
      return NextResponse.json({ error: 'Name and title are required' }, { status: 400 });
    }

    const panel = await prisma.ticketPanel.create({
      data: {
        guildId,
        name,
        title,
        description: description || 'Select a category below to open a ticket',
        color: color || '#5865F2',
        imageUrl,
        thumbnail,
        footer,
        componentType: componentType || 'SELECT',
        buttonStyle: buttonStyle || 'PRIMARY',
        selectPlaceholder: selectPlaceholder || 'Select a category...',
        enabled: enabled ?? true,
      },
      include: {
        categories: true,
      },
    });

    return ApiResponse.success(panel);
  } catch (error) {
    logger.error(`Failed to create panel: ${error}`);
    return ApiResponse.serverError();
  }
}
