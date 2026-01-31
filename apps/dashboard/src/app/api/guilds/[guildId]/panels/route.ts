import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

const sendPanelSchema = z.object({
    channelId: z.string().min(1),
    type: z.enum(['voice', 'music']),
    title: z.string().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
});

/**
 * POST - Send a panel to a Discord channel via Redis pub/sub
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    const validationError = await validateGuildAccess(guildId);
    if (validationError) return validationError;

    try {
        const body = await request.json();
        const validated = sendPanelSchema.parse(body);

        // Send command to bot via Redis
        const Redis = (await import('ioredis')).default;
        const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

        const command = {
            type: 'SEND_PANEL',
            guildId,
            channelId: validated.channelId,
            panelType: validated.type,
            customEmbed: {
                title: validated.title,
                description: validated.description,
                color: validated.color,
            },
            timestamp: Date.now(),
        };

        await redis.publish('dashboard:commands', JSON.stringify(command));
        await redis.quit();

        return ApiResponse.success({ sent: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return ApiResponse.badRequest(error.errors.map(e => e.message).join(', '));
        }
        logger.error(`Error sending panel: ${error}`);
        return ApiResponse.serverError();
    }
}
