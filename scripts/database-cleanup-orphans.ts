#!/usr/bin/env node

/**
 * Database Cleanup Orphans Script
 *
 * Cleans up orphaned records and fixes data integrity issues.
 * Run this script periodically or after migration.
 *
 * Usage:
 *   npx tsx scripts/database-cleanup-orphans.ts [--dry-run] [--verbose]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CleanupStats {
  orphanedTicketMessages: number;
  orphanedGiveawayEntries: number;
  orphanedTempVoiceChannels: number;
  orphanedModLogs: number;
  invalidMembers: number;
  expiredGiveaways: number;
  closedTickets: number;
}

interface CleanupOptions {
  dryRun: boolean;
  verbose: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CleanupOptions {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
  };
}

/**
 * Log message based on verbose flag
 */
function log(message: string, verbose: boolean): void {
  if (verbose) {
    console.log(message);
  }
}

/**
 * Clean orphaned ticket messages (ticket no longer exists)
 */
async function cleanOrphanedTicketMessages(options: CleanupOptions): Promise<number> {
  log('[TicketMessages] Finding orphaned records...', options.verbose);

  const orphaned = await prisma.ticketMessage.findMany({
    where: {
      ticket: null,
    },
    select: { id: true },
  });

  if (orphaned.length === 0) {
    log('[TicketMessages] No orphaned records found', options.verbose);
    return 0;
  }

  console.log(`[TicketMessages] Found ${orphaned.length} orphaned records`);

  if (!options.dryRun) {
    await prisma.ticketMessage.deleteMany({
      where: {
        id: { in: orphaned.map((r) => r.id) },
      },
    });
    console.log(`[TicketMessages] Deleted ${orphaned.length} orphaned records`);
  }

  return orphaned.length;
}

/**
 * Clean orphaned giveaway entries (giveaway no longer exists)
 */
async function cleanOrphanedGiveawayEntries(options: CleanupOptions): Promise<number> {
  log('[GiveawayEntries] Finding orphaned records...', options.verbose);

  const orphaned = await prisma.giveawayEntry.findMany({
    where: {
      giveaway: null,
    },
    select: { id: true },
  });

  if (orphaned.length === 0) {
    log('[GiveawayEntries] No orphaned records found', options.verbose);
    return 0;
  }

  console.log(`[GiveawayEntries] Found ${orphaned.length} orphaned records`);

  if (!options.dryRun) {
    await prisma.giveawayEntry.deleteMany({
      where: {
        id: { in: orphaned.map((r) => r.id) },
      },
    });
    console.log(`[GiveawayEntries] Deleted ${orphaned.length} orphaned records`);
  }

  return orphaned.length;
}

/**
 * Clean orphaned temp voice channels (member no longer exists)
 */
async function cleanOrphanedTempVoiceChannels(options: CleanupOptions): Promise<number> {
  log('[TempVoiceChannels] Finding orphaned records...', options.verbose);

  const orphaned = await prisma.tempVoiceChannel.findMany({
    where: {
      member: null,
    },
    select: { id: true },
  });

  if (orphaned.length === 0) {
    log('[TempVoiceChannels] No orphaned records found', options.verbose);
    return 0;
  }

  console.log(`[TempVoiceChannels] Found ${orphaned.length} orphaned records`);

  if (!options.dryRun) {
    await prisma.tempVoiceChannel.deleteMany({
      where: {
        id: { in: orphaned.map((r) => r.id) },
      },
    });
    console.log(`[TempVoiceChannels] Deleted ${orphaned.length} orphaned records`);
  }

  return orphaned.length;
}

/**
 * Clean orphaned mod logs (guild no longer exists)
 */
async function cleanOrphanedModLogs(options: CleanupOptions): Promise<number> {
  log('[ModLogs] Finding orphaned records...', options.verbose);

  const orphaned = await prisma.modLog.findMany({
    where: {
      guild: null,
    },
    select: { id: true },
  });

  if (orphaned.length === 0) {
    log('[ModLogs] No orphaned records found', options.verbose);
    return 0;
  }

  console.log(`[ModLogs] Found ${orphaned.length} orphaned records`);

  if (!options.dryRun) {
    await prisma.modLog.deleteMany({
      where: {
        id: { in: orphaned.map((r) => r.id) },
      },
    });
    console.log(`[ModLogs] Deleted ${orphaned.length} orphaned records`);
  }

  return orphaned.length;
}

/**
 * Clean invalid members (no discordId or guildId)
 */
async function cleanInvalidMembers(options: CleanupOptions): Promise<number> {
  log('[Members] Finding invalid records...', options.verbose);

  const invalid = await prisma.member.findMany({
    where: {
      OR: [
        { discordId: null },
        { discordId: '' },
        { guildId: null },
        { guildId: '' },
      ],
    },
    select: { id: true },
  });

  if (invalid.length === 0) {
    log('[Members] No invalid records found', options.verbose);
    return 0;
  }

  console.log(`[Members] Found ${invalid.length} invalid records`);

  if (!options.dryRun) {
    await prisma.member.deleteMany({
      where: {
        id: { in: invalid.map((r) => r.id) },
      },
    });
    console.log(`[Members] Deleted ${invalid.length} invalid records`);
  }

  return invalid.length;
}

/**
 * Update expired giveaways to ENDED status
 */
async function updateExpiredGiveaways(options: CleanupOptions): Promise<number> {
  log('[Giveaways] Finding expired giveaways...', options.verbose);

  const expired = await prisma.giveaway.findMany({
    where: {
      status: 'ACTIVE',
      endsAt: { lt: new Date() },
    },
    select: { id: true },
  });

  if (expired.length === 0) {
    log('[Giveaways] No expired giveaways found', options.verbose);
    return 0;
  }

  console.log(`[Giveaways] Found ${expired.length} expired giveaways`);

  if (!options.dryRun) {
    await prisma.giveaway.updateMany({
      where: {
        id: { in: expired.map((r) => r.id) },
      },
      data: { status: 'ENDED' },
    });
    console.log(`[Giveaways] Updated ${expired.length} expired giveaways to ENDED`);
  }

  return expired.length;
}

/**
 * Clean old closed tickets (older than 30 days)
 */
async function cleanOldClosedTickets(options: CleanupOptions): Promise<number> {
  log('[Tickets] Finding old closed tickets...', options.verbose);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oldTickets = await prisma.ticket.findMany({
    where: {
      status: 'CLOSED',
      closedAt: { lt: thirtyDaysAgo },
    },
    select: { id: true },
  });

  if (oldTickets.length === 0) {
    log('[Tickets] No old closed tickets found', options.verbose);
    return 0;
  }

  console.log(`[Tickets] Found ${oldTickets.length} old closed tickets`);

  if (!options.dryRun) {
    // Delete messages first (cascade should handle this, but being explicit)
    await prisma.ticketMessage.deleteMany({
      where: {
        ticketId: { in: oldTickets.map((t) => t.id) },
      },
    });

    await prisma.ticket.deleteMany({
      where: {
        id: { in: oldTickets.map((t) => t.id) },
      },
    });
    console.log(`[Tickets] Deleted ${oldTickets.length} old closed tickets`);
  }

  return oldTickets.length;
}

/**
 * Main cleanup function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log('='.repeat(60));
  console.log('Database Cleanup Orphans Script');
  console.log('='.repeat(60));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Verbose: ${options.verbose}`);
  console.log('='.repeat(60));
  console.log();

  const stats: CleanupStats = {
    orphanedTicketMessages: 0,
    orphanedGiveawayEntries: 0,
    orphanedTempVoiceChannels: 0,
    orphanedModLogs: 0,
    invalidMembers: 0,
    expiredGiveaways: 0,
    closedTickets: 0,
  };

  try {
    // Run cleanup tasks
    stats.orphanedTicketMessages = await cleanOrphanedTicketMessages(options);
    stats.orphanedGiveawayEntries = await cleanOrphanedGiveawayEntries(options);
    stats.orphanedTempVoiceChannels = await cleanOrphanedTempVoiceChannels(options);
    stats.orphanedModLogs = await cleanOrphanedModLogs(options);
    stats.invalidMembers = await cleanInvalidMembers(options);
    stats.expiredGiveaways = await updateExpiredGiveaways(options);
    stats.closedTickets = await cleanOldClosedTickets(options);

    console.log();
    console.log('='.repeat(60));
    console.log('Cleanup Summary');
    console.log('='.repeat(60));
    console.log(`Orphaned Ticket Messages:      ${stats.orphanedTicketMessages}`);
    console.log(`Orphaned Giveaway Entries:     ${stats.orphanedGiveawayEntries}`);
    console.log(`Orphaned Temp Voice Channels:  ${stats.orphanedTempVoiceChannels}`);
    console.log(`Orphaned Mod Logs:             ${stats.orphanedModLogs}`);
    console.log(`Invalid Members:               ${stats.invalidMembers}`);
    console.log(`Expired Giveaways:             ${stats.expiredGiveaways}`);
    console.log(`Old Closed Tickets:            ${stats.closedTickets}`);
    console.log('='.repeat(60));

    const total = Object.values(stats).reduce((sum, val) => sum + val, 0);
    console.log(`Total records ${options.dryRun ? 'would be' : ''} processed: ${total}`);

    if (options.dryRun) {
      console.log();
      console.log('This was a DRY RUN. No changes were made.');
      console.log('Run without --dry-run to apply changes.');
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run main function
main();
