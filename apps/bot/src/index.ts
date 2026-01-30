import { client } from './lib/client.js';
import { prisma, isTenantMode, getCurrentTenantId } from './lib/prisma.js';
import { connectRedis, redis } from './lib/redis.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { setupGlobalErrorHandlers } from './handlers/errorHandler.js';
import { initConfigSync, stopConfigSync } from './lib/configSync.js';
import { initDashboardCommands, stopDashboardCommands } from './lib/dashboardCommands.js';
import { initBotCommandsSubscriber, stopBotCommandsSubscriber } from './services/bot-redis-command-subscriber.js';
import { startHealthServer, stopHealthServer } from './lib/health.js';
import { initIPC, sendReady, sendError, isChildProcess } from './lib/ipc.js';

async function main() {
  const tenantId = getCurrentTenantId();
  const tenantLabel = tenantId ? `[Tenant: ${tenantId}]` : '[Main]';

  logger.info(`${tenantLabel} Starting Discord bot...`);

  // Initialize IPC if running as child process
  if (isChildProcess()) {
    initIPC(shutdown);
    logger.info(`${tenantLabel} IPC handler initialized`);
  }

  setupGlobalErrorHandlers();

  try {
    await prisma.$connect();
    logger.info(`${tenantLabel} Database connected`);
  } catch (err) {
    logger.error(`${tenantLabel} Database connection failed:`, err);
    if (isChildProcess()) sendError(err as Error);
    process.exit(1);
  }

  const redisConnected = await connectRedis();
  if (!redisConnected) {
    logger.warn(`${tenantLabel} Running without Redis - some features may be limited`);
  } else {
    // Initialize config sync for dashboard-to-bot real-time updates
    await initConfigSync();
    // Initialize dashboard commands subscriber (legacy)
    await initDashboardCommands();
    // Initialize bot commands subscriber (real-time sync)
    await initBotCommandsSubscriber();
  }

  await loadCommands();
  await loadEvents();

  // Start health check HTTP server (skip if HEALTH_PORT is 0)
  const healthPort = parseInt(process.env.HEALTH_PORT || '8080', 10);
  if (healthPort > 0) {
    startHealthServer(client, healthPort);
  }

  try {
    await client.login(config.discord.token);
    // Notify parent process that bot is ready
    if (isChildProcess()) {
      sendReady();
    }
  } catch (err) {
    logger.error(`${tenantLabel} Discord login failed:`, err);
    if (isChildProcess()) sendError(err as Error);
    process.exit(1);
  }
}

async function shutdown() {
  const tenantId = getCurrentTenantId();
  const tenantLabel = tenantId ? `[Tenant: ${tenantId}]` : '[Main]';

  logger.info(`${tenantLabel} Shutting down...`);

  // Stop health check server
  try {
    await stopHealthServer();
  } catch (err) {
    logger.warn(`${tenantLabel} Failed to stop health server during shutdown`, err);
  }

  // Stop config sync subscriber
  try {
    await stopConfigSync();
  } catch (err) {
    logger.warn(`${tenantLabel} Failed to stop config sync during shutdown`, err);
  }

  // Stop dashboard commands subscriber
  try {
    await stopDashboardCommands();
  } catch (err) {
    logger.warn(`${tenantLabel} Failed to stop dashboard commands during shutdown`, err);
  }

  // Stop bot commands subscriber
  try {
    await stopBotCommandsSubscriber();
  } catch (err) {
    logger.warn(`${tenantLabel} Failed to stop bot commands subscriber during shutdown`, err);
  }

  try {
    await prisma.$disconnect();
    logger.info(`${tenantLabel} Database disconnected`);
  } catch (err) {
    logger.warn(`${tenantLabel} Failed to disconnect database during shutdown`, err);
  }

  try {
    redis.disconnect();
    logger.info(`${tenantLabel} Redis disconnected`);
  } catch (err) {
    logger.warn(`${tenantLabel} Failed to disconnect Redis during shutdown`, err);
  }

  client.destroy();
  logger.info(`${tenantLabel} Discord client destroyed`);

  process.exit(0);
}

let isShuttingDown = false;

async function shutdownWithProtection() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  await shutdown();
}

process.on('SIGINT', shutdownWithProtection);
process.on('SIGTERM', shutdownWithProtection);

main().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
