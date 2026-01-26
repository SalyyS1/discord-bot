import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

const settingsSchema = z.object({
    giveawayButtonText: z.string().max(80).optional(),
    giveawayButtonEmoji: z.string().max(20).optional(),
    giveawayImageUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
});

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
                giveawayButtonText: true,
                giveawayButtonEmoji: true,
                giveawayImageUrl: true,
            },
        });

        return ApiResponse.success(settings);
    } catch (error) {
        logger.error(`Error fetching giveaway settings: ${error}`);
        return ApiResponse.serverError();
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    const validationError = await validateGuildAccess(guildId);
    if (validationError) return validationError;

    try {
        const json = await request.json();
        const result = settingsSchema.safeParse(json);

        if (!result.success) {
            return ApiResponse.badRequest(result.error.message);
        }

        const { giveawayButtonText, giveawayButtonEmoji, giveawayImageUrl } = result.data;

        const updated = await prisma.guildSettings.upsert({
            where: { guildId },
            create: {
                guildId,
                giveawayButtonText,
                giveawayButtonEmoji,
                giveawayImageUrl,
            },
            update: {
                giveawayButtonText,
                giveawayButtonEmoji,
                giveawayImageUrl,
            },
        });

        return ApiResponse.success(updated);
    } catch (error) {
        logger.error(`Error updating giveaway settings: ${error}`);
        return ApiResponse.serverError();
    }
}
