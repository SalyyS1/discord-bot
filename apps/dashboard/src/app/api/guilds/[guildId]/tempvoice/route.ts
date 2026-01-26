import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { publishTempVoiceUpdate } from '@/lib/configSync';
import { validateGuildAccess, ensureGuildExists, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

const tempVoiceConfigSchema = z.object({
  creatorChannelId: z.string().min(1),
  categoryId: z.string().min(1),
  defaultName: z.string().max(100).optional(),
  defaultLimit: z.number().int().min(0).max(99).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const config = await prisma.tempVoiceConfig.findUnique({
      where: { guildId },
    });

    return ApiResponse.success(config);
  } catch (error) {
    logger.error(`Error fetching temp voice config: ${error}`);
    return ApiResponse.serverError();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const body = await request.json();
    const validated = tempVoiceConfigSchema.parse(body);

    // Ensure guild exists before creating config
    await ensureGuildExists(guildId);

    const config = await prisma.tempVoiceConfig.upsert({
      where: { guildId },
      update: validated,
      create: {
        guildId,
        ...validated,
      },
    });

    // Publish config update for real-time sync
    await publishTempVoiceUpdate(guildId, 'update');

    return ApiResponse.success(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    logger.error(`Error updating temp voice config: ${error}`);
    return ApiResponse.serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    await prisma.tempVoiceConfig.delete({
      where: { guildId },
    });

    // Publish config update for real-time sync
    await publishTempVoiceUpdate(guildId, 'delete');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`Error deleting temp voice config: ${error}`);
    return ApiResponse.serverError();
  }
}
