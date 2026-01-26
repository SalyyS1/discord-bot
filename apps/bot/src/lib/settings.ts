import { prisma } from './prisma.js';
import { redis } from './redis.js';
import { SettingsCache } from '@repo/config';
import type { GuildSettings } from '@repo/database';

// Create settings cache instance
const settingsCache = new SettingsCache(redis, { defaultTTL: 300 });

/**
 * Ensure guild record exists before creating related records
 * Prevents FK constraint violations
 */
export async function ensureGuild(guildId: string, guildName: string): Promise<void> {
  await prisma.guild.upsert({
    where: { id: guildId },
    create: { id: guildId, name: guildName },
    update: { name: guildName },
  });
}

/**
 * Get guild settings with caching
 * Uses versioned cache for invalidation safety
 */
export async function getGuildSettings(guildId: string): Promise<GuildSettings | null> {
  return settingsCache.getOrFetch(
    guildId,
    () => prisma.guildSettings.findUnique({ where: { guildId } })
  );
}

/**
 * Get guild settings without cache (for dashboard sync)
 */
export async function getGuildSettingsDirect(guildId: string): Promise<GuildSettings | null> {
  return prisma.guildSettings.findUnique({ where: { guildId } });
}

/**
 * Invalidate settings cache for a guild
 * Call this when settings are updated via dashboard
 */
export async function invalidateSettingsCache(guildId: string): Promise<void> {
  await settingsCache.invalidate(guildId);
}

/**
 * Ensure guild settings exist, creating with defaults if needed
 */
export async function ensureGuildSettings(
  guildId: string,
  guildName: string
): Promise<GuildSettings> {
  // First ensure guild exists
  await ensureGuild(guildId, guildName);

  // Then get or create settings
  const settings = await prisma.guildSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });

  // Update cache
  await settingsCache.set(guildId, settings);

  return settings;
}

/**
 * Check if a feature is enabled for a guild
 */
export async function isFeatureEnabled(
  guildId: string,
  feature: keyof Pick<GuildSettings, 'antiLinkEnabled' | 'antiSpamEnabled' | 'levelingEnabled'>
): Promise<boolean> {
  const settings = await getGuildSettings(guildId);
  return settings?.[feature] ?? false;
}

/**
 * Export cache instance for advanced usage
 */
export { settingsCache };
