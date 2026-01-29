/**
 * Migration script for re-encrypting tenant tokens with new encryption scheme
 */

import { prisma } from '@repo/database';
import { getEncryptionService } from './encryption';

interface MigrationResult {
  total: number;
  migrated: number;
  failed: string[];
}

/**
 * Migrate all encrypted tenant tokens from legacy to current encryption format
 */
export async function migrateEncryptedTokens(): Promise<MigrationResult> {
  const encryption = getEncryptionService();

  const result: MigrationResult = { total: 0, migrated: 0, failed: [] };

  try {
    const tenants = await prisma.tenant.findMany({
      select: { id: true, discordToken: true },
    });

    result.total = tenants.length;

    for (const tenant of tenants) {
      if (!tenant.discordToken) {
        console.log(`[Migration] Tenant ${tenant.id} has no token, skipping`);
        continue;
      }

      try {
        if (!encryption.isLegacyEncryption(tenant.discordToken)) {
          console.log(`[Migration] Tenant ${tenant.id} already migrated`);
          continue;
        }

        const newToken = encryption.reencrypt(tenant.discordToken);
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { discordToken: newToken },
        });

        result.migrated++;
        console.log(`[Migration] Migrated tenant ${tenant.id}`);
      } catch (error) {
        console.error(`[Migration] Failed for tenant ${tenant.id}:`, error);
        result.failed.push(tenant.id);
      }
    }

    return result;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI runner
// ESM compatible main module check
import { fileURLToPath } from 'node:url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateEncryptedTokens()
    .then((result) => {
      console.log('\n=== Migration Complete ===');
      console.log(`Total: ${result.total}`);
      console.log(`Migrated: ${result.migrated}`);
      console.log(`Failed: ${result.failed.length}`);
      if (result.failed.length > 0) {
        console.log('Failed tenant IDs:', result.failed.join(', '));
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
