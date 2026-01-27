import { NextRequest, NextResponse } from 'next/server';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { discordService, DiscordApiError } from '@/lib/discord';
import { getGuildBotToken } from '@/lib/tenant-token';
import { logger } from '@/lib/logger';
import { validateGuildId } from '@/lib/validation';

// Discord channel type mapping
const CHANNEL_TYPE_MAP: Record<
  number,
  'text' | 'voice' | 'category' | 'announcement' | 'forum' | 'stage'
> = {
  0: 'text', // GUILD_TEXT
  2: 'voice', // GUILD_VOICE
  4: 'category', // GUILD_CATEGORY
  5: 'announcement', // GUILD_ANNOUNCEMENT
  13: 'stage', // GUILD_STAGE_VOICE
  15: 'forum', // GUILD_FORUM
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  // Validate guildId format first
  const guildIdError = validateGuildId(guildId);
  if (guildIdError) return guildIdError;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    // Resolve the correct bot token for this guild (multi-tenant support)
    const botToken = await getGuildBotToken(guildId);

    if (!botToken) {
      logger.warn(`No bot token available for guild ${guildId}`);
      return ApiResponse.error('Bot not configured for this guild', 503);
    }

    const rawChannels = await discordService.getGuildChannels(guildId, botToken);

    // Build category map for parent names
    const categoryMap = new Map<string, string>();
    rawChannels.forEach((c) => {
      if (c.type === 4) {
        // GUILD_CATEGORY
        categoryMap.set(c.id, c.name);
      }
    });

    // Transform channels to match ChannelSelector format
    const channels = rawChannels
      .filter((c) => CHANNEL_TYPE_MAP[c.type] !== undefined)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: CHANNEL_TYPE_MAP[c.type] || 'text',
        parentId: c.parent_id || null,
        parentName: c.parent_id ? categoryMap.get(c.parent_id) : undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(
      { success: true, data: channels },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    if (error instanceof DiscordApiError) {
      if (error.isForbidden()) {
        return ApiResponse.error('Bot does not have access to this guild', 403);
      }
      if (error.isRateLimited()) {
        const retryAfter = error.getRetryAfter();
        return ApiResponse.error(
          `Rate limited by Discord. Try again ${retryAfter ? `in ${retryAfter}s` : 'later'}.`,
          429
        );
      }
    }

    logger.error(`API_CHANNELS error for guild ${guildId}: ${error}`);
    return ApiResponse.serverError('Failed to fetch channels');
  }
}
