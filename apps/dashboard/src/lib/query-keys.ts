/**
 * Centralized Query Key Factory
 *
 * All TanStack Query keys should use this factory for consistency.
 * Keys are namespaced hierarchically: ['entity', id, 'sub-entity']
 */

export const queryKeys = {
    // User's guild list
    guilds: ['guilds'] as const,

    // Guild-scoped queries (hierarchical)
    guild: (guildId: string) => ['guild', guildId] as const,
    guildSettings: (guildId: string) => ['guild', guildId, 'settings'] as const,
    guildChannels: (guildId: string) => ['guild', guildId, 'channels'] as const,
    guildRoles: (guildId: string) => ['guild', guildId, 'roles'] as const,
    guildLeaderboard: (guildId: string) => ['guild', guildId, 'leaderboard'] as const,
    guildLogs: (guildId: string) => ['guild', guildId, 'logs'] as const,
    guildTickets: (guildId: string) => ['guild', guildId, 'tickets'] as const,
    guildGiveaways: (guildId: string) => ['guild', guildId, 'giveaways'] as const,
    guildStats: (guildId: string) => ['guild', guildId, 'stats'] as const,
} as const;

// Type helper for query key values
export type QueryKeys = typeof queryKeys;
