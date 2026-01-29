#!/usr/bin/env node
/**
 * Database Orphan Records Cleanup Script
 *
 * Identifies and cleans up orphaned records that don't have valid foreign key references.
 * This can happen due to manual database operations or bugs in cascade deletion.
 *
 * Usage:
 *   node scripts/database-cleanup-orphan-records.js [--dry-run] [--guild-id=xxx]
 *
 * Options:
 *   --dry-run        Show what would be deleted without actually deleting
 *   --guild-id       Only check specific guild
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OrphanReport {
  model: string;
  count: number;
  ids: string[];
}

async function findOrphanedRecords(guildId?: string): Promise<OrphanReport[]> {
  const reports: OrphanReport[] = [];

  console.log('🔍 Scanning for orphaned records...\n');

  // Find orphaned TempVoiceChannels (no valid guild)
  console.log('Checking TempVoiceChannel records...');
  const orphanedTempVoice = await prisma.$queryRaw<{ id: string }[]>`
    SELECT tvc.id
    FROM "TempVoiceChannel" tvc
    LEFT JOIN "guild" g ON tvc."guildId" = g.id
    WHERE g.id IS NULL
    ${guildId ? prisma.$queryRaw`AND tvc."guildId" = ${guildId}` : prisma.$queryRaw``}
  `;
  if (orphanedTempVoice.length > 0) {
    reports.push({
      model: 'TempVoiceChannel',
      count: orphanedTempVoice.length,
      ids: orphanedTempVoice.map((r) => r.id),
    });
  }

  // Find orphaned GiveawayEntries (no valid member or giveaway)
  console.log('Checking GiveawayEntry records...');
  const orphanedGiveawayEntries = await prisma.$queryRaw<{ id: string }[]>`
    SELECT ge.id
    FROM "GiveawayEntry" ge
    LEFT JOIN "Member" m ON ge."memberId" = m.id
    LEFT JOIN "Giveaway" g ON ge."giveawayId" = g.id
    WHERE m.id IS NULL OR g.id IS NULL
  `;
  if (orphanedGiveawayEntries.length > 0) {
    reports.push({
      model: 'GiveawayEntry',
      count: orphanedGiveawayEntries.length,
      ids: orphanedGiveawayEntries.map((r) => r.id),
    });
  }

  // Find orphaned Tickets (no valid member)
  console.log('Checking Ticket records...');
  const orphanedTickets = await prisma.$queryRaw<{ id: string }[]>`
    SELECT t.id
    FROM "Ticket" t
    LEFT JOIN "Member" m ON t."memberId" = m.id
    WHERE m.id IS NULL
    ${guildId ? prisma.$queryRaw`AND t."guildId" = ${guildId}` : prisma.$queryRaw``}
  `;
  if (orphanedTickets.length > 0) {
    reports.push({
      model: 'Ticket',
      count: orphanedTickets.length,
      ids: orphanedTickets.map((r) => r.id),
    });
  }

  // Find orphaned Warnings (no valid member)
  console.log('Checking Warning records...');
  const orphanedWarnings = await prisma.$queryRaw<{ id: string }[]>`
    SELECT w.id
    FROM "Warning" w
    LEFT JOIN "Member" m ON w."memberId" = m.id
    WHERE m.id IS NULL
    ${guildId ? prisma.$queryRaw`AND w."guildId" = ${guildId}` : prisma.$queryRaw``}
  `;
  if (orphanedWarnings.length > 0) {
    reports.push({
      model: 'Warning',
      count: orphanedWarnings.length,
      ids: orphanedWarnings.map((r) => r.id),
    });
  }

  // Find orphaned VoiceSessions (no valid guild)
  console.log('Checking VoiceSession records...');
  const orphanedVoiceSessions = await prisma.$queryRaw<{ id: string }[]>`
    SELECT vs.id
    FROM "VoiceSession" vs
    LEFT JOIN "guild" g ON vs."guildId" = g.id
    WHERE g.id IS NULL
    ${guildId ? prisma.$queryRaw`AND vs."guildId" = ${guildId}` : prisma.$queryRaw``}
  `;
  if (orphanedVoiceSessions.length > 0) {
    reports.push({
      model: 'VoiceSession',
      count: orphanedVoiceSessions.length,
      ids: orphanedVoiceSessions.map((r) => r.id),
    });
  }

  return reports;
}

async function cleanupOrphans(reports: OrphanReport[], dryRun: boolean) {
  if (reports.length === 0) {
    console.log('✅ No orphaned records found!\n');
    return;
  }

  console.log('\n📊 Orphaned Records Summary:');
  console.log('═'.repeat(50));
  let totalOrphans = 0;

  for (const report of reports) {
    console.log(`${report.model}: ${report.count} orphaned records`);
    totalOrphans += report.count;
  }

  console.log('═'.repeat(50));
  console.log(`Total: ${totalOrphans} orphaned records\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN - No records will be deleted\n');
    for (const report of reports) {
      console.log(`\n${report.model} (${report.count}):`);
      console.log(report.ids.slice(0, 10).join(', '));
      if (report.ids.length > 10) {
        console.log(`... and ${report.ids.length - 10} more`);
      }
    }
    return;
  }

  console.log('🗑️  Deleting orphaned records...\n');

  for (const report of reports) {
    try {
      if (report.model === 'TempVoiceChannel') {
        await prisma.tempVoiceChannel.deleteMany({
          where: { id: { in: report.ids } },
        });
      } else if (report.model === 'GiveawayEntry') {
        await prisma.giveawayEntry.deleteMany({
          where: { id: { in: report.ids } },
        });
      } else if (report.model === 'Ticket') {
        await prisma.ticket.deleteMany({
          where: { id: { in: report.ids } },
        });
      } else if (report.model === 'Warning') {
        await prisma.warning.deleteMany({
          where: { id: { in: report.ids } },
        });
      } else if (report.model === 'VoiceSession') {
        await prisma.voiceSession.deleteMany({
          where: { id: { in: report.ids } },
        });
      }
      console.log(`✅ Deleted ${report.count} ${report.model} records`);
    } catch (error) {
      console.error(`❌ Failed to delete ${report.model}:`, error);
    }
  }

  console.log('\n✅ Cleanup complete!\n');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const guildIdArg = args.find((arg) => arg.startsWith('--guild-id='));
  const guildId = guildIdArg?.split('=')[1];

  console.log('🧹 Database Orphan Cleanup Tool\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'CLEANUP'}`);
  if (guildId) {
    console.log(`Guild: ${guildId}`);
  }
  console.log('');

  try {
    const reports = await findOrphanedRecords(guildId);
    await cleanupOrphans(reports, dryRun);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
