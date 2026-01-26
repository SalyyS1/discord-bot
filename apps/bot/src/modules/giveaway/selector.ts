import { randomInt } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

/**
 * Cryptographically secure winner selection
 */
export class GiveawaySelector {
  /**
   * Select winners using cryptographically secure randomness
   */
  static async selectWinners(
    giveawayId: string,
    count: number,
    excludeUserIds: string[] = []
  ): Promise<string[]> {
    // Get all eligible entries
    const entries = await prisma.giveawayEntry.findMany({
      where: {
        giveawayId,
        member: {
          discordId: { notIn: excludeUserIds },
        },
      },
      include: { member: true },
    });

    if (entries.length === 0) return [];

    // Build weighted pool (bonus entries)
    const pool: string[] = [];
    for (const entry of entries) {
      // Each entry counts once (could be extended for bonus entries)
      for (let i = 0; i < entry.entries; i++) {
        pool.push(entry.member.discordId);
      }
    }

    // Select unique winners using crypto.randomInt
    const winners: string[] = [];
    const winnerSet = new Set<string>();

    while (winners.length < count && pool.length > 0) {
      const index = randomInt(pool.length);
      const winnerId = pool[index];

      if (!winnerSet.has(winnerId)) {
        winners.push(winnerId);
        winnerSet.add(winnerId);
      }

      // Remove all entries for this winner from pool to ensure uniqueness
      for (let i = pool.length - 1; i >= 0; i--) {
        if (pool[i] === winnerId) {
          pool.splice(i, 1);
        }
      }
    }

    logger.info(`Selected ${winners.length} winners for giveaway ${giveawayId}`);
    return winners;
  }

  /**
   * Check if user is blacklisted from giveaways
   */
  static async isBlacklisted(
    guildId: string,
    userId: string
  ): Promise<boolean> {
    const blacklist = await prisma.blacklist.findUnique({
      where: {
        guildId_userId_type: {
          guildId,
          userId,
          type: 'GIVEAWAY',
        },
      },
    });

    if (!blacklist) return false;

    // Check if expired
    if (blacklist.expiresAt && blacklist.expiresAt < new Date()) {
      await prisma.blacklist.delete({
        where: { id: blacklist.id },
      });
      return false;
    }

    return true;
  }
}
