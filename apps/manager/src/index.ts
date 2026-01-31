/**
 * Bot Manager Service Entry Point
 *
 * Manages multiple tenant bot instances.
 * Handles spawning, monitoring, and lifecycle management.
 */

import 'dotenv/config';
import { BotSpawner } from './spawner.js';
import { HealthMonitor } from './health.js';
import { createApi } from './api.js';
import { prisma } from '@repo/database';
import { logger } from './logger.js';
import { validateSecurityEnvOrExit } from './env-validation.js';

const PORT = parseInt(process.env.MANAGER_PORT || '3001', 10);
const AUTO_START = process.env.AUTO_START_BOTS === 'true';

async function main() {
  // Fail-fast: validate security env vars before any initialization
  validateSecurityEnvOrExit();

  logger.info('Starting Bot Manager Service...');

  // Create instances
  const spawner = new BotSpawner({
    botEntryPoint: process.env.BOT_ENTRY_POINT || '../bot/dist/index.js',
    maxRestarts: parseInt(process.env.MAX_RESTARTS || '3', 10),
    restartDelay: parseInt(process.env.RESTART_DELAY || '5000', 10),
  });

  const healthMonitor = new HealthMonitor(spawner, {
    pingIntervalMs: parseInt(process.env.HEALTH_PING_INTERVAL || '30000', 10),
    healthTimeout: parseInt(process.env.HEALTH_TIMEOUT || '60000', 10),
  });

  // Start health monitoring
  healthMonitor.start();

  // Set up spawner event listeners
  spawner.on('bot:started', (tenantId) => {
    logger.info(`Bot started`, { tenantId });
  });

  spawner.on('bot:stopped', async (tenantId, code) => {
    logger.info(`Bot stopped (code: ${code})`, { tenantId });

    // Update database status
    try {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          isRunning: false,
          lastStoppedAt: new Date(),
        },
      });
    } catch (err) {
      logger.error(`Failed to update tenant status: ${err}`, { tenantId });
    }
  });

  spawner.on('bot:error', (tenantId, error) => {
    logger.error(`Bot error: ${error.message}`, { tenantId });
  });

  spawner.on('bot:ready', async (tenantId, guilds) => {
    logger.info(`Bot ready (${guilds} guilds)`, { tenantId });

    // Update database
    try {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'ACTIVE',
          currentGuilds: guilds,
        },
      });
    } catch (err) {
      logger.error(`Failed to update tenant: ${err}`, { tenantId });
    }
  });

  // Create and start API server
  const app = createApi(spawner, healthMonitor);

  const server = app.listen(PORT, () => {
    logger.info(`API server listening on port ${PORT}`);
  });

  // Auto-start bots marked as running
  if (AUTO_START) {
    logger.info('Auto-starting previously running bots...');

    try {
      const activeTenants = await prisma.tenant.findMany({
        where: { isRunning: true },
      });

      for (const tenant of activeTenants) {
        try {
          logger.info(`Auto-starting bot`, { tenantId: tenant.id });
          // Token stays encrypted - spawner decrypts it securely at spawn time
          await spawner.spawn({
            tenantId: tenant.id,
            discordTokenEncrypted: tenant.discordToken, // Already encrypted in DB
            discordClientId: tenant.discordClientId,
            databaseUrl: buildTenantDatabaseUrl(tenant.id),
          });
        } catch (err) {
          logger.error(`Failed to auto-start: ${err}`, { tenantId: tenant.id });
        }
      }
    } catch (err) {
      logger.error(`Failed to query tenants: ${err}`);
    }
  }

  // Graceful shutdown
  async function shutdown() {
    logger.info('Shutting down...');

    // Stop health monitor
    healthMonitor.stop();

    // Stop all bots
    await spawner.shutdown();

    // Close HTTP server
    server.close();

    // Disconnect database
    await prisma.$disconnect();

    logger.info('Shutdown complete');
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Helper to build tenant database URL
function buildTenantDatabaseUrl(tenantId: string): string {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', `tenant_${tenantId}`);
    return url.toString();
  } catch (err) {
    throw new Error(`Invalid DATABASE_URL format: ${(err as Error).message}`);
  }
}

main().catch((err) => {
  logger.error(`Fatal error: ${err}`);
  process.exit(1);
});
