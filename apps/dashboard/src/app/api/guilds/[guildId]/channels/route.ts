import { NextRequest } from 'next/server';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { discordService } from '@/lib/discord';
import { logger } from '@/lib/logger';

// Discord channel type mapping
const CHANNEL_TYPE_MAP: Record<number, 'text' | 'voice' | 'category' | 'announcement' | 'forum' | 'stage'> = {
    0: 'text',           // GUILD_TEXT
    2: 'voice',          // GUILD_VOICE
    4: 'category',       // GUILD_CATEGORY
    5: 'announcement',   // GUILD_ANNOUNCEMENT
    13: 'stage',         // GUILD_STAGE_VOICE
    15: 'forum',         // GUILD_FORUM
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    const validationError = await validateGuildAccess(guildId);
    if (validationError) return validationError;

    try {
        const rawChannels = await discordService.getGuildChannels(guildId);

        // Build category map for parent names
        const categoryMap = new Map<string, string>();
        rawChannels.forEach(c => {
            if (c.type === 4) { // GUILD_CATEGORY
                categoryMap.set(c.id, c.name);
            }
        });

        // Transform channels to match ChannelSelector format
        const channels = rawChannels
            .filter(c => CHANNEL_TYPE_MAP[c.type] !== undefined)
            .map(c => ({
                id: c.id,
                name: c.name,
                type: CHANNEL_TYPE_MAP[c.type] || 'text',
                parentId: c.parent_id || null,
                parentName: c.parent_id ? categoryMap.get(c.parent_id) : undefined,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return ApiResponse.success(channels);
    } catch (error) {
        logger.error(`API_CHANNELS error: ${error}`);
        return ApiResponse.serverError('Failed to fetch channels');
    }
}
