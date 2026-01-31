/**
 * Discord API Client
 * Handles interactions with Discord API for fetching user guilds and related data
 */

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Fetch user's guilds from Discord API
 */
export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Discord access token expired or invalid');
      }
      throw new Error(`Discord API error: ${response.status}`);
    }

    const guilds: DiscordGuild[] = await response.json();
    return guilds;
  } catch (error) {
    console.error('Error fetching Discord guilds:', error);
    throw error;
  }
}

/**
 * Fetch user information from Discord API
 */
export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    const user: DiscordUser = await response.json();
    return user;
  } catch (error) {
    console.error('Error fetching Discord user:', error);
    throw error;
  }
}

/**
 * Check if user has MANAGE_GUILD permission
 * Permission value is a bitfield
 */
export function hasManageGuildPermission(permissions: string): boolean {
  const MANAGE_GUILD = 0x00000020; // 32
  const ADMINISTRATOR = 0x00000008; // 8

  const permissionValue = parseInt(permissions, 10);

  return (
    (permissionValue & ADMINISTRATOR) === ADMINISTRATOR ||
    (permissionValue & MANAGE_GUILD) === MANAGE_GUILD
  );
}

/**
 * Get guild icon URL
 */
export function getGuildIconUrl(guildId: string, iconHash: string | null, size = 256): string | null {
  if (!iconHash) return null;

  const extension = iconHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${extension}?size=${size}`;
}

/**
 * Get user avatar URL
 */
export function getUserAvatarUrl(userId: string, avatarHash: string | null, size = 256): string | null {
  if (!avatarHash) {
    // Default Discord avatar
    const defaultAvatarNumber = parseInt(userId) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
  }

  const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
}
