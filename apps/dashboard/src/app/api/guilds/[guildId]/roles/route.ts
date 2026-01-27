import { NextRequest, NextResponse } from 'next/server';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { discordService, DiscordApiError } from '@/lib/discord';
import { getGuildBotToken } from '@/lib/tenant-token';
import { logger } from '@/lib/logger';

// GET - Get guild roles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    // Resolve the correct bot token for this guild (multi-tenant support)
    const botToken = await getGuildBotToken(guildId);

    if (!botToken) {
      logger.warn(`No bot token available for guild ${guildId}`);
      return ApiResponse.error('Bot not configured for this guild', 503);
    }

    // Use discordService instead of getGuildRoles from discord-oauth
    const roles = await discordService.getGuildRoles(guildId, botToken);

    // Filter out @everyone and managed roles, sort by position
    const filteredRoles = roles
      .filter(
        (role: { name: string; managed?: boolean }) => role.name !== '@everyone' && !role.managed
      )
      .sort((a: { position: number }, b: { position: number }) => b.position - a.position)
      .map((role: { id: string; name: string; color: number; position: number }) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
      }));

    return NextResponse.json(
      { success: true, data: filteredRoles },
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

    logger.error(`API_ROLES error for guild ${guildId}: ${error}`);
    return ApiResponse.serverError('Failed to fetch roles');
  }
}
