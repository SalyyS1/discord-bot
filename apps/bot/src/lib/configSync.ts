import { ConfigSubscriber, type ConfigUpdateMessage } from '@repo/config';
import { redis } from './redis.js';
import { logger } from '../utils/logger.js';
import { invalidateSettingsCache } from './settings.js';

let subscriber: ConfigSubscriber | null = null;

/**
 * Cache invalidation handlers for each module
 */
const cacheInvalidators: Record<string, (guildId: string) => void | Promise<void>> = {
  // Global settings cache invalidation (versioned cache)
  SETTINGS: async (guildId) => {
    await invalidateSettingsCache(guildId);
    logger.info(`[ConfigSync] Invalidated settings cache for ${guildId}`);
  },
  WELCOME: async (guildId) => {
    // Invalidate welcome config cache + settings
    await invalidateSettingsCache(guildId);
    await redis.del(`welcome:config:${guildId}`);
    logger.info(`[ConfigSync] Invalidated welcome config for ${guildId}`);
  },
  MODERATION: async (guildId) => {
    // Invalidate moderation config cache + settings
    await invalidateSettingsCache(guildId);
    await redis.del(`moderation:config:${guildId}`);
    await redis.del(`antispam:config:${guildId}`);
    await redis.del(`antilink:config:${guildId}`);
    logger.info(`[ConfigSync] Invalidated moderation config for ${guildId}`);
  },
  LEVELING: async (guildId) => {
    // Invalidate leveling config cache + settings
    await invalidateSettingsCache(guildId);
    await redis.del(`leveling:config:${guildId}`);
    logger.info(`[ConfigSync] Invalidated leveling config for ${guildId}`);
  },
  AUTORESPONDER: async (guildId) => {
    // Invalidate autoresponder cache
    await redis.del(`autoresponder:${guildId}`);
    logger.info(`[ConfigSync] Invalidated autoresponder cache for ${guildId}`);
  },
  TEMPVOICE: async (guildId) => {
    // Invalidate temp voice config cache + settings
    await invalidateSettingsCache(guildId);
    await redis.del(`tempvoice:config:${guildId}`);
    logger.info(`[ConfigSync] Invalidated tempvoice config for ${guildId}`);
  },
  TICKETS: async (guildId) => {
    // Invalidate ticket config cache + settings
    await invalidateSettingsCache(guildId);
    await redis.del(`tickets:config:${guildId}`);
    logger.info(`[ConfigSync] Invalidated tickets config for ${guildId}`);
  },
  GIVEAWAY: async (guildId) => {
    // Invalidate giveaway config cache + settings
    await invalidateSettingsCache(guildId);
    await redis.del(`giveaway:config:${guildId}`);
    logger.info(`[ConfigSync] Invalidated giveaway config for ${guildId}`);
  },
};

/**
 * Handle incoming config update
 */
async function handleConfigUpdate(message: ConfigUpdateMessage): Promise<void> {
  const { guildId, module, action } = message;
  
  logger.info(`[ConfigSync] Received ${action} for ${module} in guild ${guildId}`);
  
  // Run the appropriate cache invalidator
  const invalidator = cacheInvalidators[module];
  if (invalidator) {
    await invalidator(guildId);
  }
}

/**
 * Initialize the config sync subscriber
 */
export async function initConfigSync(): Promise<void> {
  try {
    subscriber = new ConfigSubscriber(redis);
    
    // Register handler for all config updates
    subscriber.onAny(handleConfigUpdate);
    
    // Start listening
    await subscriber.subscribe();
    
    logger.info('[ConfigSync] Config sync subscriber initialized');
  } catch (error) {
    logger.error('[ConfigSync] Failed to initialize:', error);
  }
}

/**
 * Cleanup the config sync subscriber
 */
export async function stopConfigSync(): Promise<void> {
  if (subscriber) {
    await subscriber.disconnect();
    subscriber = null;
    logger.info('[ConfigSync] Config sync subscriber stopped');
  }
}
