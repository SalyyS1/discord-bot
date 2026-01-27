/**
 * Tenant Token Resolution Layer
 *
 * Resolves the correct bot token for a guild by looking up its tenant association.
 * Handles token decryption, caching, and fallback to default DISCORD_TOKEN.
 */

import { prisma } from '@repo/database';
import { getEncryptionService } from '@repo/security';
import { logger } from './logger';

// In-memory cache for decrypted tokens
interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the bot token for a specific guild.
 * Looks up tenant, decrypts token, caches result.
 *
 * @param guildId - Discord guild ID
 * @returns Decrypted bot token or null if unavailable
 */
export async function getGuildBotToken(guildId: string): Promise<string | null> {
  // Check cache first
  const cached = tokenCache.get(guildId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  try {
    // Look up guild's tenant
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      select: { tenantId: true },
    });

    if (!guild?.tenantId) {
      // No tenant - use default token
      return process.env.DISCORD_TOKEN || null;
    }

    // Get tenant's encrypted token
    const tenant = await prisma.tenant.findUnique({
      where: { id: guild.tenantId },
      select: { discordToken: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      logger.warn(`Tenant not active for guild ${guildId}`);
      return process.env.DISCORD_TOKEN || null;
    }

    // Decrypt token with explicit error handling
    let decryptedToken: string;
    try {
      const encryptionService = getEncryptionService();
      decryptedToken = encryptionService.decrypt(tenant.discordToken);
    } catch (decryptError) {
      // VALIDATED DECISION: Option C - Fallback + log alert for admin
      logger.error(`[ADMIN ALERT] Token decryption failed for guild ${guildId}`, {
        error: String(decryptError),
        tenantId: guild.tenantId,
        severity: 'high',
        action: 'Investigate tenant token configuration',
      });
      // Fallback to default token on decryption failure
      return process.env.DISCORD_TOKEN || null;
    }

    // Cache the result
    tokenCache.set(guildId, {
      token: decryptedToken,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return decryptedToken;
  } catch (error) {
    logger.error(`Failed to resolve token for guild ${guildId}: ${error}`);
    // Fallback to default token
    return process.env.DISCORD_TOKEN || null;
  }
}

/**
 * Clear cached token for a guild.
 * Call when tenant token changes or is rotated.
 *
 * @param guildId - Discord guild ID to invalidate
 */
export function invalidateTokenCache(guildId: string): void {
  tokenCache.delete(guildId);
}

/**
 * Clear all cached tokens.
 * Useful for testing or emergency token rotation.
 */
export function clearAllTokenCache(): void {
  tokenCache.clear();
}

/**
 * Check if a guild has a tenant-specific token (vs default).
 * Does not decrypt or validate the token.
 *
 * @param guildId - Discord guild ID
 * @returns True if guild has tenant-specific token
 */
export async function hasCustomToken(guildId: string): Promise<boolean> {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: { tenantId: true },
  });

  if (!guild?.tenantId) {
    return false;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: guild.tenantId },
    select: { status: true },
  });

  return tenant?.status === 'ACTIVE';
}
