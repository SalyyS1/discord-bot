/**
 * Tenant Isolation Middleware
 *
 * NOTE: Prisma v5+ deprecated $use middleware in favor of $extends.
 * This file provides the logic but needs to be adapted to use Prisma Client Extensions.
 *
 * For now, ensure tenant isolation by:
 * 1. Always include guildId in where clauses
 * 2. Use the transaction helpers in safe-transaction-helpers.ts
 * 3. Validate guildId in API route middleware
 *
 * TODO: Migrate to Prisma Client Extensions API
 * See: https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions
 */

// Models that require guildId filtering for tenant isolation
export const GUILD_SCOPED_MODELS = [
  'Member',
  'Warning',
  'ModLog',
  'Giveaway',
  'GiveawayEntry',
  'GiveawayWinner',
  'Ticket',
  'TicketPanel',
  'TicketCategory',
  'TicketProduct',
  'Invite',
  'AutoResponder',
  'LevelRole',
  'DailyQuest',
  'QuestProgress',
  'Suggestion',
  'StickyMessage',
  'Blacklist',
  'MessageTemplate',
  'GuildStats',
  'AuditLogEntry',
  'VoiceSession',
  'SavedPlaylist',
  'TempVoiceChannel',
] as const;

/**
 * Validate that a guildId is provided for tenant-scoped operations
 */
export function validateTenantAccess(model: string, guildId?: string): void {
  if (GUILD_SCOPED_MODELS.includes(model as any) && !guildId) {
    throw new Error(`Guild ID required for ${model} operations`);
  }
}

/**
 * Inject guildId into query where clause
 */
export function injectGuildId<T extends { guildId?: string }>(
  where: T,
  guildId: string
): T & { guildId: string } {
  return { ...where, guildId };
}

