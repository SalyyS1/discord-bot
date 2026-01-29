/**
 * Guild Access Validator
 * Validates user access to guilds based on Discord permissions and bot presence
 */

import { prisma } from '@repo/database';
import { fetchUserGuilds, hasManageGuildPermission, type DiscordGuild } from './discord-api-client';

export interface AccessibleGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  botPresent: boolean;
}

/**
 * Get user's accessible guilds (guilds where user has MANAGE_GUILD and bot is present)
 */
export async function getUserAccessibleGuilds(userId: string): Promise<AccessibleGuild[]> {
  try {
    // Get Discord account for user
    const discordAccount = await prisma.account.findFirst({
      where: {
        userId,
        providerId: 'discord',
      },
      select: {
        accessToken: true,
        refreshToken: true,
      },
    });

    if (!discordAccount?.accessToken) {
      console.warn(`No Discord account found for user ${userId}`);
      return [];
    }

    // Fetch user's guilds from Discord API
    const userGuilds = await fetchUserGuilds(discordAccount.accessToken);

    // Get guilds where bot is present
    const botGuilds = await prisma.guild.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    const botGuildIds = new Set(botGuilds.map((g) => g.id));

    // Filter guilds where user has permission AND bot is present
    const accessibleGuilds: AccessibleGuild[] = userGuilds
      .filter((guild) => {
        const hasPermission = guild.owner || hasManageGuildPermission(guild.permissions);
        const hasBotPresent = botGuildIds.has(guild.id);
        return hasPermission && hasBotPresent;
      })
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: guild.owner,
        permissions: guild.permissions,
        botPresent: true,
      }));

    return accessibleGuilds;
  } catch (error) {
    console.error('Error getting user accessible guilds:', error);
    throw new Error('Failed to fetch accessible guilds');
  }
}

/**
 * Validate if user has access to specific guild
 */
export async function validateUserGuildAccess(userId: string, guildId: string): Promise<boolean> {
  try {
    const accessibleGuilds = await getUserAccessibleGuilds(userId);
    return accessibleGuilds.some((guild) => guild.id === guildId);
  } catch (error) {
    console.error('Error validating guild access:', error);
    return false;
  }
}

/**
 * Get guilds where bot is present but user doesn't have access
 */
export async function getInaccessibleBotGuilds(userId: string): Promise<DiscordGuild[]> {
  try {
    const discordAccount = await prisma.account.findFirst({
      where: {
        userId,
        providerId: 'discord',
      },
      select: {
        accessToken: true,
      },
    });

    if (!discordAccount?.accessToken) {
      return [];
    }

    const userGuilds = await fetchUserGuilds(discordAccount.accessToken);
    const botGuilds = await prisma.guild.findMany({
      select: { id: true },
    });

    const botGuildIds = new Set(botGuilds.map((g) => g.id));

    return userGuilds.filter((guild) => {
      const hasPermission = guild.owner || hasManageGuildPermission(guild.permissions);
      const hasBotPresent = botGuildIds.has(guild.id);
      return !hasPermission && hasBotPresent;
    });
  } catch (error) {
    console.error('Error getting inaccessible guilds:', error);
    return [];
  }
}

/**
 * Cache key generator for guild access
 */
export function getGuildAccessCacheKey(userId: string): string {
  return `guild-access:${userId}`;
}

/**
 * Invalidate guild access cache for user
 */
export async function invalidateGuildAccessCache(userId: string): Promise<void> {
  // Implementation depends on caching strategy (Redis, in-memory, etc.)
  // For now, this is a placeholder for future caching implementation
  console.log(`Invalidating cache for user ${userId}`);
}
