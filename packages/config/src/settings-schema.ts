/**
 * Settings Validation Schemas
 * Provides Zod schemas for validating guild settings updates
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════
// Reusable Schema Components
// ═══════════════════════════════════════════════

/** Discord snowflake ID (17-19 digits) */
const snowflakeSchema = z.string().regex(/^\d{17,19}$/, 'Invalid Discord ID');
const nullableSnowflake = snowflakeSchema.nullable().optional();
const snowflakeArraySchema = z.array(snowflakeSchema).default([]);

/** MessageConfig for rich message customization */
const messageConfigSchema = z
  .object({
    content: z.string().max(2000).optional(),
    embeds: z.array(z.any()).max(10).optional(),
    components: z.array(z.any()).max(5).optional(),
  })
  .nullable()
  .optional();

// ═══════════════════════════════════════════════
// Category Schemas
// ═══════════════════════════════════════════════

/** Core settings */
export const coreSchema = z.object({
  timezone: z.string().max(50).default('UTC'),
  locale: z.string().max(10).default('en'),
  logChannelId: nullableSnowflake,
  modLogChannelId: nullableSnowflake,
  muteRoleId: nullableSnowflake,
});

/** Anti-Spam settings */
export const antiSpamSchema = z.object({
  antiSpamEnabled: z.boolean(),
  antiSpamMaxMessages: z.number().int().min(1).max(20).default(5),
  antiSpamInterval: z.number().int().min(1).max(60).default(5),
  antiSpamDuplicates: z.number().int().min(1).max(10).default(3),
  antiSpamWarnThreshold: z.number().int().min(1).max(10).default(3),
  antiSpamMuteThreshold: z.number().int().min(1).max(20).default(5),
  antiSpamMuteDuration: z.number().int().min(60).max(86400).default(600),
});

/** Anti-Link settings */
export const antiLinkSchema = z.object({
  antiLinkEnabled: z.boolean(),
  antiLinkWhitelist: z.array(z.string().url()).default([]),
});

/** Word Filter settings */
export const wordFilterSchema = z.object({
  wordFilterEnabled: z.boolean(),
  filteredWords: z.array(z.string().max(100)).max(500).default([]),
  wordFilterAction: z.enum(['DELETE', 'WARN', 'TIMEOUT', 'KICK']).default('DELETE'),
  wordFilterWhitelist: snowflakeArraySchema,
});

/** Mention Spam settings */
export const mentionSpamSchema = z.object({
  mentionSpamEnabled: z.boolean(),
  mentionSpamThreshold: z.number().int().min(1).max(50).default(5),
});

/** Welcome settings */
export const welcomeSchema = z.object({
  welcomeEnabled: z.boolean(),
  welcomeChannelId: nullableSnowflake,
  welcomeMessage: z.string().max(2000).nullable().optional(),
  welcomeMessageConfig: messageConfigSchema,
  welcomeImageEnabled: z.boolean().default(false),
});

/** Goodbye settings */
export const goodbyeSchema = z.object({
  goodbyeEnabled: z.boolean(),
  goodbyeChannelId: nullableSnowflake,
  goodbyeMessage: z.string().max(2000).nullable().optional(),
  goodbyeMessageConfig: messageConfigSchema,
  goodbyeImageEnabled: z.boolean().default(false),
});

/** Auto-Role settings */
export const autoRoleSchema = z.object({
  autoRoleEnabled: z.boolean(),
  autoRoleIds: snowflakeArraySchema,
});

/** Verification settings */
export const verificationSchema = z.object({
  verificationEnabled: z.boolean(),
  verifiedRoleId: nullableSnowflake,
  verificationChannelId: nullableSnowflake,
});

/** Leveling settings */
export const levelingSchema = z.object({
  levelingEnabled: z.boolean(),
  xpCooldownSeconds: z.number().int().min(0).max(3600).default(60),
  xpMin: z.number().int().min(1).max(100).default(15),
  xpMax: z.number().int().min(1).max(200).default(25),
  noXpChannelIds: snowflakeArraySchema,
  noXpRoleIds: snowflakeArraySchema,
  xpMultipliers: z.record(z.string(), z.number().min(0.1).max(10)).nullable().optional(),
  levelUpDmEnabled: z.boolean().default(false),
  levelUpChannelId: nullableSnowflake,
  levelUpMessageConfig: messageConfigSchema,
});

/** Voice XP settings */
export const voiceXpSchema = z.object({
  voiceXpEnabled: z.boolean(),
  voiceXpPerMinute: z.number().int().min(1).max(50).default(6),
  voiceXpCooldown: z.number().int().min(0).max(3600).default(60),
});

/** Suggestions settings */
export const suggestionsSchema = z.object({
  suggestionsEnabled: z.boolean(),
  suggestionsChannelId: nullableSnowflake,
});

/** Tickets settings */
export const ticketsSchema = z.object({
  ticketsEnabled: z.boolean(),
  ticketCategoryId: nullableSnowflake,
  ticketLogChannelId: nullableSnowflake,
  ticketPanelConfig: messageConfigSchema,
  ticketWelcomeConfig: messageConfigSchema,
  ticketCloseConfig: messageConfigSchema,
  ticketMaxPerUser: z.number().int().min(1).max(10).default(3),
  ticketCooldownMinutes: z.number().int().min(0).max(60).default(5),
  ticketAntiRaidEnabled: z.boolean().default(false),
  ticketAntiRaidThreshold: z.number().int().min(1).max(100).default(10),
});

/** Giveaway settings */
export const giveawaySchema = z.object({
  giveawayEnabled: z.boolean(),
  giveawayButtonText: z.string().max(80).default('Enter'),
  giveawayButtonEmoji: z.string().max(32).default('🎉'),
  giveawayImageUrl: z.string().url().nullable().optional(),
  giveawayStartConfig: messageConfigSchema,
  giveawayEndConfig: messageConfigSchema,
  giveawayWinConfig: messageConfigSchema,
});

/** Temp Voice settings */
export const tempVoiceSchema = z.object({
  tempVoiceEnabled: z.boolean(),
  tempVoiceCreatorId: nullableSnowflake,
  tempVoiceCategoryId: nullableSnowflake,
});

/** Utility settings */
export const utilitySchema = z.object({
  autoResponderEnabled: z.boolean(),
  stickyMessagesEnabled: z.boolean(),
});

/** Rating settings */
export const ratingSchema = z.object({
  ratingEnabled: z.boolean(),
  ratingChannelId: nullableSnowflake,
  ratingPromptConfig: messageConfigSchema,
  ratingReviewConfig: messageConfigSchema,
});

// ═══════════════════════════════════════════════
// Category Registry
// ═══════════════════════════════════════════════

export const SETTINGS_CATEGORIES = {
  core: coreSchema,
  antiSpam: antiSpamSchema,
  antiLink: antiLinkSchema,
  wordFilter: wordFilterSchema,
  mentionSpam: mentionSpamSchema,
  welcome: welcomeSchema,
  goodbye: goodbyeSchema,
  autoRole: autoRoleSchema,
  verification: verificationSchema,
  leveling: levelingSchema,
  voiceXp: voiceXpSchema,
  suggestions: suggestionsSchema,
  tickets: ticketsSchema,
  giveaway: giveawaySchema,
  tempVoice: tempVoiceSchema,
  utility: utilitySchema,
  rating: ratingSchema,
} as const;

export type SettingsCategory = keyof typeof SETTINGS_CATEGORIES;

// ═══════════════════════════════════════════════
// Validation Functions
// ═══════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  data?: unknown;
}

/**
 * Validate settings update for a specific category
 */
export function validateSettingsUpdate(
  category: string,
  data: unknown
): ValidationResult {
  const schema = SETTINGS_CATEGORIES[category as SettingsCategory];

  if (!schema) {
    return { valid: false, errors: [`Unknown settings category: ${category}`] };
  }

  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
    };
  }

  return { valid: true, data: result.data };
}

/**
 * Get list of valid category names
 */
export function getValidCategories(): string[] {
  return Object.keys(SETTINGS_CATEGORIES);
}

/**
 * Check if a category is valid
 */
export function isValidCategory(category: string): category is SettingsCategory {
  return category in SETTINGS_CATEGORIES;
}

// ═══════════════════════════════════════════════
// Field Mapping
// ═══════════════════════════════════════════════

/**
 * Map category name to database field prefix
 * Used for extracting/updating specific category fields
 */
export const CATEGORY_FIELD_MAP: Record<SettingsCategory, string[]> = {
  core: ['timezone', 'locale', 'logChannelId', 'modLogChannelId', 'muteRoleId'],
  antiSpam: [
    'antiSpamEnabled',
    'antiSpamMaxMessages',
    'antiSpamInterval',
    'antiSpamDuplicates',
    'antiSpamWarnThreshold',
    'antiSpamMuteThreshold',
    'antiSpamMuteDuration',
  ],
  antiLink: ['antiLinkEnabled', 'antiLinkWhitelist'],
  wordFilter: [
    'wordFilterEnabled',
    'filteredWords',
    'wordFilterAction',
    'wordFilterWhitelist',
  ],
  mentionSpam: ['mentionSpamEnabled', 'mentionSpamThreshold'],
  welcome: [
    'welcomeEnabled',
    'welcomeChannelId',
    'welcomeMessage',
    'welcomeMessageConfig',
    'welcomeImageEnabled',
  ],
  goodbye: [
    'goodbyeEnabled',
    'goodbyeChannelId',
    'goodbyeMessage',
    'goodbyeMessageConfig',
    'goodbyeImageEnabled',
  ],
  autoRole: ['autoRoleEnabled', 'autoRoleIds'],
  verification: ['verificationEnabled', 'verifiedRoleId', 'verificationChannelId'],
  leveling: [
    'levelingEnabled',
    'xpCooldownSeconds',
    'xpMin',
    'xpMax',
    'noXpChannelIds',
    'noXpRoleIds',
    'xpMultipliers',
    'levelUpDmEnabled',
    'levelUpChannelId',
    'levelUpMessageConfig',
  ],
  voiceXp: ['voiceXpEnabled', 'voiceXpPerMinute', 'voiceXpCooldown'],
  suggestions: ['suggestionsEnabled', 'suggestionsChannelId'],
  tickets: [
    'ticketsEnabled',
    'ticketCategoryId',
    'ticketLogChannelId',
    'ticketPanelConfig',
    'ticketWelcomeConfig',
    'ticketCloseConfig',
    'ticketMaxPerUser',
    'ticketCooldownMinutes',
    'ticketAntiRaidEnabled',
    'ticketAntiRaidThreshold',
  ],
  giveaway: [
    'giveawayEnabled',
    'giveawayButtonText',
    'giveawayButtonEmoji',
    'giveawayImageUrl',
    'giveawayStartConfig',
    'giveawayEndConfig',
    'giveawayWinConfig',
  ],
  tempVoice: ['tempVoiceEnabled', 'tempVoiceCreatorId', 'tempVoiceCategoryId'],
  utility: ['autoResponderEnabled', 'stickyMessagesEnabled'],
  rating: [
    'ratingEnabled',
    'ratingChannelId',
    'ratingPromptConfig',
    'ratingReviewConfig',
  ],
};

/**
 * Extract fields for a specific category from full settings object
 */
export function extractCategoryFields<T extends Record<string, unknown>>(
  category: SettingsCategory,
  settings: T | null
): Partial<T> {
  if (!settings) return {};

  const fields = CATEGORY_FIELD_MAP[category];
  const result: Partial<T> = {};

  for (const field of fields) {
    if (field in settings) {
      result[field as keyof T] = settings[field as keyof T];
    }
  }

  return result;
}

/**
 * Get all field names for a category
 */
export function getCategoryFields(category: SettingsCategory): string[] {
  return CATEGORY_FIELD_MAP[category] || [];
}
