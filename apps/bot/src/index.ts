import { client } from './lib/client.js';
import { prisma } from './lib/prisma.js';
import { connectRedis, redis } from './lib/redis.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { setupGlobalErrorHandlers } from './handlers/errorHandler.js';

async function main() {
  logger.info('Starting Discord bot...');

  setupGlobalErrorHandlers();

  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (err) {
    logger.error('Database connection failed:', err);
    process.exit(1);
  }

  const redisConnected = await connectRedis();
  if (!redisConnected) {
    logger.warn('Running without Redis - some features may be limited');
  }

  await loadCommands();
  await loadEvents();

  try {
    await client.login(config.discord.token);
  } catch (err) {
    logger.error('Discord login failed:', err);
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('Shutting down...');

  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch {
    // Ignore
  }

  try {
    redis.disconnect();
    logger.info('Redis disconnected');
  } catch {
    // Ignore
  }

  client.destroy();
  logger.info('Discord client destroyed');

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
