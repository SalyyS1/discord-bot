/**
 * Discord OAuth Token Management
 * Handles token refresh with mutex to prevent race conditions
 */

import { prisma } from '@repo/database';
import { logger } from './logger';

// Get Discord client credentials from environment
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';

// Token refresh buffer - refresh 10 minutes before expiry
const REFRESH_BUFFER_MS = 10 * 60 * 1000;

// In-memory mutex map for token refresh operations
// Key: userId, Value: Promise of token refresh result
const refreshLocks = new Map<string, Promise<string | null>>();

interface DiscordAccount {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
}

/**
 * Get a valid Discord access token for a user
 * Handles token refresh with mutex to prevent race conditions
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  // Check if refresh is already in progress for this user
  const existingLock = refreshLocks.get(userId);
  if (existingLock) {
    // Wait for existing refresh to complete
    return existingLock;
  }

  const account = await prisma.account.findFirst({
    where: { userId, providerId: 'discord' },
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
      accessTokenExpiresAt: true,
    },
  });

  if (!account?.accessToken) {
    return null;
  }

  // Check if token needs refresh (with 10 minute buffer)
  const needsRefresh = tokenNeedsRefresh(account.accessTokenExpiresAt);

  if (!needsRefresh) {
    return account.accessToken;
  }

  // Token needs refresh - acquire mutex
  const refreshPromise = performTokenRefresh(userId, account);
  refreshLocks.set(userId, refreshPromise);

  try {
    return await refreshPromise;
  } finally {
    // Release mutex
    refreshLocks.delete(userId);
  }
}

/**
 * Check if token needs refresh
 * Returns true if token is expired or will expire within buffer period
 */
function tokenNeedsRefresh(expiresAt: Date | null): boolean {
  if (!expiresAt) {
    // No expiry set - assume needs refresh for safety
    return true;
  }

  const now = Date.now();
  const expiryTime = expiresAt.getTime();

  // Refresh if token expires within buffer period
  return now > expiryTime - REFRESH_BUFFER_MS;
}

/**
 * Perform the actual token refresh
 * Called with mutex held
 */
async function performTokenRefresh(
  userId: string,
  account: DiscordAccount
): Promise<string | null> {
  if (!account.refreshToken) {
    logger.warn(`[OAuth] No refresh token for user ${userId}`);
    return null;
  }

  try {
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));

      if (error.error === 'invalid_grant') {
        // Refresh token revoked or expired - clear tokens
        logger.warn(`[OAuth] Refresh token invalid for user ${userId}, clearing tokens`);
        await prisma.account.update({
          where: { id: account.id },
          data: {
            accessToken: null,
            refreshToken: null,
            accessTokenExpiresAt: null,
          },
        });
        return null;
      }

      logger.error(`[OAuth] Token refresh failed for user ${userId}: ${response.status}`);
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const tokens = await response.json();

    // Discord may rotate refresh tokens - always save the new one
    await prisma.account.update({
      where: { id: account.id },
      data: {
        accessToken: tokens.access_token,
        // Discord might return a new refresh token
        refreshToken: tokens.refresh_token || account.refreshToken,
        accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    logger.info(`[OAuth] Token refreshed for user ${userId}`);
    return tokens.access_token;
  } catch (error) {
    logger.error(`[OAuth] Token refresh error for user ${userId}`, { error: String(error) });
    return null;
  }
}

/**
 * Fetch user's Discord guilds using a valid access token
 * Automatically handles token refresh
 */
export async function getUserDiscordGuilds(userId: string): Promise<DiscordGuild[]> {
  const token = await getValidAccessToken(userId);

  if (!token) {
    return [];
  }

  try {
    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token might have been revoked - trigger a re-auth on next attempt
        logger.warn(`[OAuth] Token unauthorized for user ${userId}`);
      }
      return [];
    }

    return await response.json();
  } catch (error) {
    logger.error(`[OAuth] Error fetching guilds for user ${userId}`, { error: String(error) });
    return [];
  }
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

// Bot token for API calls that require bot permissions
const DISCORD_BOT_TOKEN = process.env.DISCORD_TOKEN || '';

/**
 * Fetch guild roles using bot token
 * Bot must be in the guild to fetch roles
 */
export async function getGuildRoles(guildId: string): Promise<DiscordRole[]> {
  if (!DISCORD_BOT_TOKEN) {
    logger.error('[OAuth] No bot token configured');
    return [];
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });

    if (!response.ok) {
      logger.error(`[OAuth] Failed to fetch roles for guild ${guildId}: ${response.status}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    logger.error(`[OAuth] Error fetching roles for guild ${guildId}`, { error: String(error) });
    return [];
  }
}
