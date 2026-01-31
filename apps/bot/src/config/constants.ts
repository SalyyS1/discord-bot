/**
 * Shared constants to eliminate magic numbers
 */

export const DURATIONS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

export const DEFAULTS = {
  // Leveling
  XP_COOLDOWN: 60,
  XP_MIN: 15,
  XP_MAX: 25,
  VOICE_XP_PER_MIN: 6,

  // Anti-spam
  ANTI_SPAM_MAX_MESSAGES: 5,
  ANTI_SPAM_INTERVAL: 5,
  ANTI_SPAM_DUPLICATES: 3,
  ANTI_SPAM_WARN_THRESHOLD: 3,
  ANTI_SPAM_MUTE_THRESHOLD: 5,
  ANTI_SPAM_MUTE_DURATION: 10 * 60, // seconds

  // Timeouts
  TIMEOUT_DURATION: 10 * DURATIONS.MINUTE,
  WARNING_DELETE_DELAY: 5000,
} as const;

export const COLORS = {
  SUCCESS: 0x00ff00,
  ERROR: 0xff0000,
  WARNING: 0xff6600,
  INFO: 0x5865f2,
  GIVEAWAY: 0x5865f2,
  MODERATION: 0xff6600,
  LEVEL_UP: 0x00ff00,
} as const;

export const LIMITS = {
  EMBED_DESCRIPTION: 4096,
  EMBED_FIELDS: 25,
  EMBED_FIELD_NAME: 256,
  EMBED_FIELD_VALUE: 1024,
  MESSAGE_LENGTH: 2000,
  REASON_LENGTH: 512,
  AUTOCOMPLETE_CHOICES: 25,
} as const;

export const CACHE = {
  SETTINGS_TTL: 60, // seconds
  LEADERBOARD_TTL: 300, // 5 minutes
  COOLDOWN_KEY_PREFIX: 'cooldown:',
  SETTINGS_KEY_PREFIX: 'settings:',
} as const;
