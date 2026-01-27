/**
 * Validation utilities for API routes
 */

/**
 * Validates Discord snowflake ID format
 * Snowflakes are 17-19 digit numbers
 */
export function isValidGuildId(guildId: string): boolean {
  return /^\d{17,19}$/.test(guildId);
}

/**
 * Validation helper for API routes
 * Returns error response if invalid, null if valid
 */
export function validateGuildId(guildId: string): Response | null {
  if (!isValidGuildId(guildId)) {
    return Response.json({ success: false, error: 'Invalid guild ID format' }, { status: 400 });
  }
  return null;
}

/**
 * Validates Discord user ID format (same as snowflake)
 */
export function isValidUserId(userId: string): boolean {
  return /^\d{17,19}$/.test(userId);
}

/**
 * Validates Discord channel ID format (same as snowflake)
 */
export function isValidChannelId(channelId: string): boolean {
  return /^\d{17,19}$/.test(channelId);
}

/**
 * Validates Discord role ID format (same as snowflake)
 */
export function isValidRoleId(roleId: string): boolean {
  return /^\d{17,19}$/.test(roleId);
}
