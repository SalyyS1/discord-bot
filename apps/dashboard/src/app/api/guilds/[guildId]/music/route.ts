import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { validateGuildAccess, ensureGuildExists, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

const musicSettingsSchema = z.object({
    enabled: z.boolean().optional(),
    djRoleId: z.string().nullable().optional(),
    requestChannelId: z.string().nullable().optional(),
    defaultVolume: z.number().int().min(0).max(100).optional(),
    maxQueueSize: z.number().int().min(10).max(1000).optional(),
    voteSkipEnabled: z.boolean().optional(),
    voteSkipPercent: z.number().int().min(1).max(100).optional(),
    announceTrackChange: z.boolean().optional(),
    stay24_7: z.boolean().optional(),
    autoplayEnabled: z.boolean().optional(),
    disconnectOnEmpty: z.number().int().min(0).optional(),
    nowPlayingConfig: z.any().nullable().optional(),
});

/**
 * GET - Get music settings for a guild
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    const validationError = await validateGuildAccess(guildId);
    if (validationError) return validationError;

    try {
        const settings = await prisma.musicSettings.findUnique({
            where: { guildId },
        });

        // Get listening stats
        const topTracks = await prisma.listeningHistory.findMany({
            where: { guildId },
            orderBy: { playCount: 'desc' },
            take: 10,
        });

        // Get saved playlists count
        const playlistCount = await prisma.savedPlaylist.count({
            where: { guildId },
        });

        return ApiResponse.success({
            settings: settings || {
                enabled: true,
                defaultVolume: 50,
                maxQueueSize: 500,
                voteSkipEnabled: true,
                voteSkipPercent: 50,
                announceTrackChange: true,
                stay24_7: false,
                autoplayEnabled: false,
                disconnectOnEmpty: 300,
            },
            topTracks,
            playlistCount,
        });
    } catch (error) {
        logger.error(`Error fetching music settings: ${error}`);
        return ApiResponse.serverError();
    }
}

/**
 * PATCH - Update music settings
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
        const validated = musicSettingsSchema.parse(body);

        await ensureGuildExists(guildId);

        const settings = await prisma.musicSettings.upsert({
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
            return ApiResponse.badRequest(error.errors.map(e => e.message).join(', '));
        }
        logger.error(`Error updating music settings: ${error}`);
        return ApiResponse.serverError();
    }
}
