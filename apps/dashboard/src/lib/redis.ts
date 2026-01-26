import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Singleton pattern for Redis client
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Create or reuse Redis client
export const redis = globalForRedis.redis ?? new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  family: 4, // Force IPv4 for WSL compatibility
});

// Only set listeners once
if (!globalForRedis.redis) {
  redis.on('error', (err) => {
    logger.error(`Dashboard Redis connection error: ${err.message}`);
  });

  redis.on('connect', () => {
    logger.info('Dashboard Redis connected');
  });

  // Store in global to reuse across HMR
  if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis;
  }
}

// Publisher for sending commands to bot
export async function publishToBotCommand(data: object): Promise<boolean> {
  try {
    await redis.publish('dashboard:commands', JSON.stringify(data));
    return true;
  } catch (error) {
    logger.error(`Dashboard Redis publish error: ${error}`);
    return false;
  }
}
