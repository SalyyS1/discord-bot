/**
 * Shared Redis Singleton Instance
 * Prevents creating multiple Redis connections and memory leaks
 */

import Redis from 'ioredis';

let sharedRedis: Redis | null = null;
let connectionPromise: Promise<Redis> | null = null;

/**
 * Get shared Redis instance
 * Prevents creating multiple connections
 */
export function getSharedRedis(): Redis {
  if (!sharedRedis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    sharedRedis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableReadyCheck: true,
    } as any);

    sharedRedis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    sharedRedis.on('connect', () => {
      console.log('[Redis] Connected');
    });

    sharedRedis.on('close', () => {
      console.warn('[Redis] Connection closed');
    });
  }

  return sharedRedis;
}

/**
 * Connect Redis (call during startup)
 */
export async function connectRedis(): Promise<void> {
  const redis = getSharedRedis();
  if (redis.status === 'ready') return;

  if (!connectionPromise) {
    connectionPromise = redis.connect().then(() => redis);
  }

  await connectionPromise;
}

/**
 * Disconnect Redis (call during shutdown)
 */
export async function disconnectRedis(): Promise<void> {
  if (sharedRedis) {
    await sharedRedis.quit();
    sharedRedis = null;
    connectionPromise = null;
  }
}

/**
 * Health check
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const redis = getSharedRedis();
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
