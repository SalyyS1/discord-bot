export * from './env';
export * from './sync/index';
export * from './cache';
export * from './audit';
export * from './settings-schema';
export * from './message-compiler';
export * from './features';

/**
 * Shared constants
 */
export const constants = {
  // XP Settings
  DEFAULT_XP_COOLDOWN: 60,
  DEFAULT_XP_MIN: 15,
  DEFAULT_XP_MAX: 25,

  // Leveling
  BASE_XP_PER_LEVEL: 100,
  XP_MULTIPLIER: 50,

  // Moderation
  MAX_WARNINGS_BEFORE_KICK: 3,
  MAX_WARNINGS_BEFORE_BAN: 5,

  // Cache TTLs
  SETTINGS_CACHE_TTL: 300, // 5 minutes
  LEADERBOARD_CACHE_TTL: 300, // 5 minutes
  XP_COOLDOWN_TTL: 60, // 1 minute
  SUBSCRIPTION_CACHE_TTL: 300, // 5 minutes

  // Limits
  MAX_GIVEAWAY_WINNERS: 20,
  MAX_BUTTON_ROLES: 25,
  MAX_AUTO_RESPONDERS: 50,

  // Health check
  HEALTH_CHECK_TIMEOUT: 5000, // 5 seconds
} as const;
