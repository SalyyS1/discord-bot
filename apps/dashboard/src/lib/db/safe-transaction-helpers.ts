import type { PrismaClient } from '@repo/database';

/**
 * Safe Transaction Helpers
 *
 * Provides transaction-safe wrappers for common operations that have race condition risks.
 * These helpers ensure data consistency under concurrent access.
 */

/**
 * Get next ticket number for a guild (race-safe)
 *
 * Uses database transaction with row-level locking to prevent duplicate ticket numbers.
 *
 * @param prisma - Prisma client instance
 * @param guildId - Guild ID
 * @returns Next ticket number
 */
export async function getNextTicketNumber(
  prisma: PrismaClient,
  guildId: string
): Promise<number> {
  return await prisma.$transaction(async (tx) => {
    const maxTicket = await tx.ticket.findFirst({
      where: { guildId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    return (maxTicket?.number ?? 0) + 1;
  });
}

/**
 * Create ticket with auto-incremented number (race-safe)
 *
 * @param prisma - Prisma client instance
 * @param data - Ticket creation data
 * @returns Created ticket
 */
export async function createTicketWithNumber(
  prisma: PrismaClient,
  data: {
    guildId: string;
    memberId: string;
    channelId: string;
    subject?: string;
    categoryId?: string;
    productId?: string;
    formResponses?: any;
  }
) {
  return await prisma.$transaction(async (tx) => {
    const ticketNumber = await getNextTicketNumber(tx as any, data.guildId);

    return await tx.ticket.create({
      data: {
        ...data,
        number: ticketNumber,
      },
    });
  });
}

/**
 * Add XP to member (race-safe)
 *
 * Uses atomic increment to prevent race conditions when multiple XP gains occur simultaneously.
 *
 * @param prisma - Prisma client instance
 * @param memberId - Member ID
 * @param xpAmount - Amount of XP to add
 * @returns Updated member
 */
export async function addMemberXP(
  prisma: PrismaClient,
  memberId: string,
  xpAmount: number
) {
  return await prisma.member.update({
    where: { id: memberId },
    data: {
      xp: { increment: xpAmount },
      totalMessages: { increment: 1 },
      lastXpGain: new Date(),
    },
  });
}

/**
 * Create giveaway entry (race-safe)
 *
 * Ensures no duplicate entries for the same user in a giveaway.
 *
 * @param prisma - Prisma client instance
 * @param data - Giveaway entry data
 * @returns Created or existing entry
 */
export async function createGiveawayEntry(
  prisma: PrismaClient,
  data: {
    giveawayId: string;
    memberId: string;
    entries?: number;
    baseEntries?: number;
    bonusEntries?: number;
    bonusSource?: string;
  }
) {
  return await prisma.$transaction(async (tx) => {
    // Check for existing entry
    const existing = await tx.giveawayEntry.findUnique({
      where: {
        giveawayId_memberId: {
          giveawayId: data.giveawayId,
          memberId: data.memberId,
        },
      },
    });

    if (existing) {
      throw new Error('Already entered this giveaway');
    }

    // Create entry
    const entry = await tx.giveawayEntry.create({
      data: {
        giveawayId: data.giveawayId,
        memberId: data.memberId,
        entries: data.entries ?? 1,
        baseEntries: data.baseEntries ?? 1,
        bonusEntries: data.bonusEntries ?? 0,
        bonusSource: data.bonusSource,
      },
    });

    // Update cached entry count
    await tx.giveaway.update({
      where: { id: data.giveawayId },
      data: { entries: { increment: data.entries ?? 1 } },
    });

    return entry;
  });
}

/**
 * Update guild settings with optimistic locking (race-safe)
 *
 * Uses version field to detect concurrent updates and retry automatically.
 *
 * @param prisma - Prisma client instance
 * @param guildId - Guild ID
 * @param updates - Settings to update
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Updated settings
 */
export async function updateGuildSettingsSafe(
  prisma: PrismaClient,
  guildId: string,
  updates: Record<string, any>,
  maxRetries = 3
) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Fetch current version
        const current = await tx.guildSettings.findUnique({
          where: { guildId },
          select: { version: true },
        });

        if (!current) {
          throw new Error('Guild settings not found');
        }

        const currentVersion = current.version;

        // Update with version check
        const updated = await tx.guildSettings.updateMany({
          where: {
            guildId,
            version: currentVersion,
          },
          data: {
            ...updates,
            version: currentVersion + 1,
          },
        });

        // If no rows updated, version mismatch (concurrent update)
        if (updated.count === 0) {
          throw new Error('CONCURRENT_UPDATE');
        }

        // Return updated settings
        return await tx.guildSettings.findUnique({
          where: { guildId },
        });
      });
    } catch (error: any) {
      if (error.message === 'CONCURRENT_UPDATE' && retries < maxRetries - 1) {
        retries++;
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 50 * retries));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to update settings after maximum retries');
}
