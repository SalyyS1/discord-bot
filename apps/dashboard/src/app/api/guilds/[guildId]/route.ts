import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { validateGuildAccess, ensureGuildExists, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

const guildSettingsSchema = z.object({
  logChannelId: z.string().optional().nullable(),
  modLogChannelId: z.string().optional().nullable(),
  muteRoleId: z.string().optional().nullable(),
  autoRoleIds: z.array(z.string()).optional(),
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
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        settings: true,
      },
    });

    if (!guild) {
      return ApiResponse.notFound('Guild');
    }

    return ApiResponse.success(guild);
  } catch (error) {
    logger.error(`Error fetching guild: ${error}`);
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
    const validated = guildSettingsSchema.parse(body);

    // Ensure guild exists before creating settings
    await ensureGuildExists(guildId);

    const settings = await prisma.guildSettings.upsert({
      where: { guildId },
      update: validated,
      create: {
        guildId,
        ...validated,
      },
    });

    return ApiResponse.success(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(error.errors[0]?.message || 'Validation failed');
    }
    logger.error(`Error updating guild settings: ${error}`);
    return ApiResponse.serverError();
  }
}
