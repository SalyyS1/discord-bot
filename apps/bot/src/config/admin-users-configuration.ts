/**
 * Admin Users Configuration
 * Get admin user IDs from environment
 * Never hardcode admin IDs in source
 */

/**
 * Get admin user IDs from environment
 * Never hardcode admin IDs in source
 */
export function getAdminUserIds(): string[] {
  const adminIds = process.env.BOT_ADMIN_IDS;

  if (!adminIds) {
    console.warn('[Config] BOT_ADMIN_IDS not set, no admins configured');
    return [];
  }

  return adminIds.split(',').map(id => id.trim()).filter(Boolean);
}

/**
 * Check if user is admin
 */
export function isAdmin(userId: string): boolean {
  return getAdminUserIds().includes(userId);
}
