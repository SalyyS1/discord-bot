import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 3) {
      logger.warn('Redis connection failed, running without cache');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
  family: 4, // Force IPv4
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err: Error) => logger.error('Redis error:', err));
redis.on('close', () => logger.warn('Redis connection closed'));

export async function connectRedis(): Promise<boolean> {
  try {
    await redis.connect();
    await redis.ping();
    return true;
  } catch {
    logger.warn('Redis unavailable, running without cache');
    return false;
  }
}
