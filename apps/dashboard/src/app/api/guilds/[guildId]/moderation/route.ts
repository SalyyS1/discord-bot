import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { publishModerationUpdate } from '@/lib/configSync';
import { validateGuildAccess, ensureGuildExists, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';
import { validateGuildId } from '@/lib/validation';

const moderationConfigSchema = z.object({
  antiSpamEnabled: z.boolean().optional(),
  antiLinkEnabled: z.boolean().optional(),
  antiLinkWhitelist: z.array(z.string()).optional(),
  muteRoleId: z.string().optional().nullable(),
  modLogChannelId: z.string().optional().nullable(),
  // Anti-spam configuration
  antiSpamMaxMessages: z.number().int().min(2).max(20).optional(),
  antiSpamInterval: z.number().int().min(1).max(30).optional(),
  antiSpamDuplicates: z.number().int().min(2).max(10).optional(),
  antiSpamWarnThreshold: z.number().int().min(1).max(10).optional(),
  antiSpamMuteThreshold: z.number().int().min(1).max(20).optional(),
  antiSpamMuteDuration: z.number().int().min(60).max(86400).optional(),
  // Word filter
  wordFilterEnabled: z.boolean().optional(),
  filteredWords: z.array(z.string()).optional(),
  wordFilterAction: z.enum(['DELETE', 'WARN', 'TIMEOUT', 'BAN']).optional(),
  wordFilterWhitelist: z.array(z.string()).optional(),
  // Mention spam
  mentionSpamEnabled: z.boolean().optional(),
  mentionSpamThreshold: z.number().int().min(2).max(20).optional(),
});

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
      select: {
        antiSpamEnabled: true,
        antiLinkEnabled: true,
        antiLinkWhitelist: true,
        muteRoleId: true,
        modLogChannelId: true,
        antiSpamMaxMessages: true,
        antiSpamInterval: true,
        antiSpamDuplicates: true,
        antiSpamWarnThreshold: true,
        antiSpamMuteThreshold: true,
        antiSpamMuteDuration: true,
        wordFilterEnabled: true,
        filteredWords: true,
        wordFilterAction: true,
        wordFilterWhitelist: true,
        mentionSpamEnabled: true,
        mentionSpamThreshold: true,
      },
    });

    if (!settings) {
      // Ensure guild exists before creating settings
      await ensureGuildExists(guildId);

      settings = await prisma.guildSettings.create({
        data: { guildId },
        select: {
          antiSpamEnabled: true,
          antiLinkEnabled: true,
          antiLinkWhitelist: true,
          muteRoleId: true,
          modLogChannelId: true,
          antiSpamMaxMessages: true,
          antiSpamInterval: true,
          antiSpamDuplicates: true,
          antiSpamWarnThreshold: true,
          antiSpamMuteThreshold: true,
          antiSpamMuteDuration: true,
          wordFilterEnabled: true,
          filteredWords: true,
          wordFilterAction: true,
          wordFilterWhitelist: true,
          mentionSpamEnabled: true,
          mentionSpamThreshold: true,
        },
      });
    }

    return ApiResponse.success(settings);
  } catch (error) {
    logger.error(`Error fetching moderation config: ${error}`);
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
    const validated = moderationConfigSchema.parse(body);

    // Ensure guild exists before upserting settings
    await ensureGuildExists(guildId);

    const settings = await prisma.guildSettings.upsert({
      where: { guildId },
      update: validated,
      create: {
        guildId,
        ...validated,
      },
      select: {
        antiSpamEnabled: true,
        antiLinkEnabled: true,
        antiLinkWhitelist: true,
        muteRoleId: true,
        modLogChannelId: true,
        antiSpamMaxMessages: true,
        antiSpamInterval: true,
        antiSpamDuplicates: true,
        antiSpamWarnThreshold: true,
        antiSpamMuteThreshold: true,
        antiSpamMuteDuration: true,
        wordFilterEnabled: true,
        filteredWords: true,
        wordFilterAction: true,
        wordFilterWhitelist: true,
        mentionSpamEnabled: true,
        mentionSpamThreshold: true,
      },
    });

    // Publish config update for real-time sync
    await publishModerationUpdate(guildId);

    return ApiResponse.success(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    logger.error(`Error updating moderation config: ${error}`);
    return ApiResponse.serverError();
  }
}
