/**
 * Discord API Service
 *
 * Provides typed access to Discord REST API endpoints.
 * Supports dynamic bot token per guild for multi-tenant systems.
 */

const DISCORD_API_URL = 'https://discord.com/api/v10';
const DEFAULT_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;

/**
 * Custom error class for Discord API errors.
 * Provides helper methods for common error status codes.
 */
export class DiscordApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly endpoint?: string
  ) {
    super(`Discord API ${status}: ${body}`);
    this.name = 'DiscordApiError';
  }

  /** Check if error is rate limit (429) */
  isRateLimited(): boolean {
    return this.status === 429;
  }

  /** Check if resource not found (404) */
  isNotFound(): boolean {
    return this.status === 404;
  }

  /** Check if bot lacks access/permissions (403) */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /** Check if unauthorized/invalid token (401) */
  isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Parse rate limit retry-after header if available */
  getRetryAfter(): number | null {
    try {
      const parsed = JSON.parse(this.body);
      return parsed.retry_after ?? null;
    } catch {
      return null;
    }
  }
}

/** Options for Discord API fetch with optional dynamic token */
interface FetchDiscordOptions extends RequestInit {
  botToken?: string;
}

/**
 * Fetch data from Discord API using provided or default Bot Token
 *
 * @param endpoint - API endpoint (e.g., '/guilds/{id}/channels')
 * @param options - Fetch options with optional botToken override
 * @throws {DiscordApiError} On non-2xx response
 */
async function fetchDiscord(endpoint: string, options: FetchDiscordOptions = {}) {
  const { botToken, ...fetchOptions } = options;
  const token = botToken || DEFAULT_BOT_TOKEN;

  if (!token) {
    throw new Error('No bot token available');
  }

  const res = await fetch(`${DISCORD_API_URL}${endpoint}`, {
    ...fetchOptions,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new DiscordApiError(res.status, errorBody, endpoint);
  }

  return res.json();
}

// ============ Type Definitions ============

export interface DiscordChannel {
  id: string;
  name: string;
  type: number; // 0 = GUILD_TEXT, 2 = GUILD_VOICE, 4 = GUILD_CATEGORY, 5 = GUILD_ANNOUNCEMENT, 13 = GUILD_STAGE_VOICE, 15 = GUILD_FORUM
  parent_id?: string | null;
  position?: number;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed?: boolean;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  approximate_member_count?: number;
  approximate_presence_count?: number;
  owner_id?: string;
  features?: string[];
}

// ============ Discord Service ============

export const discordService = {
  /**
   * Get all channels in a guild
   * @param guildId - Discord guild ID
   * @param botToken - Optional bot token override
   */
  getGuildChannels: async (guildId: string, botToken?: string): Promise<DiscordChannel[]> => {
    return fetchDiscord(`/guilds/${guildId}/channels`, { botToken });
  },

  /**
   * Get all roles in a guild
   * @param guildId - Discord guild ID
   * @param botToken - Optional bot token override
   */
  getGuildRoles: async (guildId: string, botToken?: string): Promise<DiscordRole[]> => {
    return fetchDiscord(`/guilds/${guildId}/roles`, { botToken });
  },

  /**
   * Get guild info with member counts
   * Requires GUILD_MEMBERS intent for accurate counts
   *
   * @param guildId - Discord guild ID
   * @param botToken - Optional bot token override
   */
  getGuild: async (guildId: string, botToken?: string): Promise<DiscordGuild> => {
    return fetchDiscord(`/guilds/${guildId}?with_counts=true`, { botToken });
  },

  /**
   * Get current bot user info
   * Useful for validating token and getting bot details
   *
   * @param botToken - Optional bot token override
   */
  getCurrentUser: async (
    botToken?: string
  ): Promise<{ id: string; username: string; avatar: string | null }> => {
    return fetchDiscord('/users/@me', { botToken });
  },
};
