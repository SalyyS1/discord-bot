import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { validateGuildAccess, ensureGuildExists, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';
import { publishTempVoiceUpdate } from '@/lib/configSync';

const voiceSettingsSchema = z.object({
    tempVoiceEnabled: z.boolean().optional(),
    tempVoiceCreatorId: z.string().nullable().optional(),
    tempVoiceCategoryId: z.string().nullable().optional(),
    voiceDefaultLimit: z.number().int().min(0).max(99).optional(),
    voiceDefaultBitrate: z.number().int().min(8).max(384).optional(),
    voiceDefaultRegion: z.string().nullable().optional(),
    voiceLockByDefault: z.boolean().optional(),
    voiceAutoDeleteEmpty: z.boolean().optional(),
    voiceControlPanelConfig: z.any().nullable().optional(),
});

/**
 * GET - Get voice settings for a guild
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    const validationError = await validateGuildAccess(guildId);
    if (validationError) return validationError;

    try {
        const settings = await prisma.guildSettings.findUnique({
            where: { guildId },
            select: {
                tempVoiceEnabled: true,
                tempVoiceCreatorId: true,
                tempVoiceCategoryId: true,
                voiceDefaultLimit: true,
                voiceDefaultBitrate: true,
                voiceDefaultRegion: true,
                voiceLockByDefault: true,
                voiceAutoDeleteEmpty: true,
                voiceControlPanelConfig: true,
            },
        });

        // Get active voice sessions count
        const activeSessions = await prisma.voiceSession.count({
            where: { guildId },
        });

        return ApiResponse.success({
            ...settings,
            activeSessions,
        });
    } catch (error) {
        logger.error(`Error fetching voice settings: ${error}`);
        return ApiResponse.serverError();
    }
}

/**
 * PATCH - Update voice settings
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    const validationError = await validateGuildAccess(guildId);
    if (validationError) return validationError;

    try {
        const body = await request.json();
        const validated = voiceSettingsSchema.parse(body);

        await ensureGuildExists(guildId);

        const settings = await prisma.guildSettings.upsert({
            where: { guildId },
            update: validated,
            create: {
                guildId,
                ...validated,
            },
            select: {
                tempVoiceEnabled: true,
                tempVoiceCreatorId: true,
                tempVoiceCategoryId: true,
                voiceDefaultLimit: true,
                voiceDefaultBitrate: true,
                voiceDefaultRegion: true,
                voiceLockByDefault: true,
                voiceAutoDeleteEmpty: true,
            },
        });

        // Sync to TempVoiceConfig table for bot to read
        if (validated.tempVoiceEnabled && validated.tempVoiceCreatorId && validated.tempVoiceCategoryId) {
            await prisma.tempVoiceConfig.upsert({
                where: { guildId },
                update: {
                    creatorChannelId: validated.tempVoiceCreatorId,
                    categoryId: validated.tempVoiceCategoryId,
                    defaultLimit: validated.voiceDefaultLimit,
                },
                create: {
                    guildId,
                    creatorChannelId: validated.tempVoiceCreatorId,
                    categoryId: validated.tempVoiceCategoryId,
                    defaultName: "{user}'s Channel",
                    defaultLimit: validated.voiceDefaultLimit,
                },
            });
        } else if (validated.tempVoiceEnabled === false) {
            // Disable temp voice
            await prisma.tempVoiceConfig.delete({
                where: { guildId },
            }).catch(() => { }); // Ignore if not exists
        }

        // Notify bot to invalidate cache
        await publishTempVoiceUpdate(guildId, 'update');

        return ApiResponse.success(settings);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest(error.errors.map(e => e.message).join(', '));
        }
        logger.error(`Error updating voice settings: ${error}`);
        return ApiResponse.serverError();
    }
}
