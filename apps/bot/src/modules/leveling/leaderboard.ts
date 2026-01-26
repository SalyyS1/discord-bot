import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { logger } from '../../utils/logger.js';

interface LeaderboardEntry {
  discordId: string;
  xp: number;
  level: number;
  rank: number;
}

const CACHE_TTL = 300; // 5 minutes

/**
 * Leaderboard module with Redis caching
 */
export class LeaderboardModule {
  /**
   * Get top N members by XP
   */
  static async getTopMembers(
    guildId: string,
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:${guildId}`;

    // Try cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const entries: LeaderboardEntry[] = JSON.parse(cached);
        return entries.slice(0, limit);
      }
    } catch (error) {
      logger.error('Redis cache error:', error);
    }

    // Query database
    const members = await prisma.member.findMany({
      where: { guildId },
      orderBy: { xp: 'desc' },
      take: 100, // Cache top 100
      select: {
        discordId: true,
        xp: true,
        level: true,
      },
    });

    const entries: LeaderboardEntry[] = members.map((m, i) => ({
      discordId: m.discordId,
      xp: m.xp,
      level: m.level,
      rank: i + 1,
    }));

    // Cache results
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(entries));
    } catch (error) {
      logger.error('Redis cache set error:', error);
    }

    return entries.slice(0, limit);
  }

  /**
   * Invalidate leaderboard cache
   */
  static async invalidate(guildId: string): Promise<void> {
    try {
      await redis.del(`leaderboard:${guildId}`);
    } catch (error) {
      logger.error('Failed to invalidate leaderboard cache:', error);
    }
  }
}
