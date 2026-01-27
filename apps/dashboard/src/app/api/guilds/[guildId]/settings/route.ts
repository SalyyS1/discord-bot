import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { validateGuildAccess, ensureGuildExists, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';
import { getPublisher } from '@/lib/configSync';
import { validateGuildId } from '@/lib/validation';

const settingsUpdateSchema = z
  .object({
    // Welcome & Goodbye
    welcomeChannelId: z.string().optional().nullable(),
    welcomeMessage: z.string().max(2000).optional().nullable(),
    welcomeImageEnabled: z.boolean().optional(),
    goodbyeChannelId: z.string().optional().nullable(),
    goodbyeMessage: z.string().max(2000).optional().nullable(),
    goodbyeImageEnabled: z.boolean().optional(),

    // Tickets
    ticketCategoryId: z.string().optional().nullable(),
    ticketLogChannelId: z.string().optional().nullable(),
    ticketWelcomeMessage: z.string().max(2000).optional().nullable(),

    // Logging
    logChannelId: z.string().optional().nullable(),

    // Moderation
    muteRoleId: z.string().optional().nullable(),
    automodEnabled: z.boolean().optional(),

    // Leveling
    levelingEnabled: z.boolean().optional(),
    levelUpChannelId: z.string().optional().nullable(),
    levelUpMessage: z.string().max(500).optional().nullable(),
  })
  .partial();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  // Validate guildId format first
  const guildIdError = validateGuildId(guildId);
  if (guildIdError) return guildIdError;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    let settings = await prisma.guildSettings.findUnique({
      where: { guildId },
    });

    if (!settings) {
      // Ensure guild exists before creating settings
      await ensureGuildExists(guildId);

      settings = await prisma.guildSettings.create({
        data: { guildId },
      });
    }

    return ApiResponse.success(settings);
  } catch (error) {
    logger.error(`Error fetching guild settings: ${error}`);
    return ApiResponse.serverError();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  // Validate guildId format first
  const guildIdError = validateGuildId(guildId);
  if (guildIdError) return guildIdError;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const body = await request.json();
    const validated = settingsUpdateSchema.parse(body);

    // Ensure guild exists before upserting settings
    await ensureGuildExists(guildId);

    const settings = await prisma.guildSettings.upsert({
      where: { guildId },
      update: validated,
      create: {
        guildId,
        ...validated,
      },
    });

    // Notify bot to invalidate its cache via Redis Pub/Sub
    try {
      const publisher = getPublisher();
      await publisher.publishSettings(guildId);
    } catch (pubsubError) {
      // Log but don't fail the request - DB is source of truth
      logger.warn(`Failed to publish settings update: ${pubsubError}`);
    }

    return ApiResponse.success(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(error.errors[0]?.message || 'Validation failed');
    }
    logger.error(`Error updating guild settings: ${error}`);
    return ApiResponse.serverError();
  }
}
