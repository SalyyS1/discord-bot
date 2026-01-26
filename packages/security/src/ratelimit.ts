/**
 * Rate Limiting Service using Redis
 * Protects against abuse and ensures fair resource usage
 */

import Redis from 'ioredis';

// Lazy-initialized Redis client
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on('error', (err) => {
      console.error('[RateLimit] Redis connection error:', err.message);
    });
  }
  return redis;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp when window resets
  limit: number;
}

/**
 * Check and increment rate limit for a key
 * @param key - Unique identifier for the rate limit bucket
 * @param limit - Maximum number of requests allowed in window
 * @param windowSeconds - Duration of the rate limit window in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const fullKey = `ratelimit:${key}`;
  const client = getRedis();
  
  try {
    // Increment counter atomically
    const current = await client.incr(fullKey);
    
    // Set expiry on first request in window
    if (current === 1) {
      await client.expire(fullKey, windowSeconds);
    }
    
    // Get TTL to calculate reset time
    const ttl = await client.ttl(fullKey);
    const resetAt = Math.floor(Date.now() / 1000) + (ttl > 0 ? ttl : windowSeconds);
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt,
      limit,
    };
  } catch (error) {
    // If Redis fails, allow the request but log error
    console.error('[RateLimit] Redis error:', error);
    return {
      allowed: true,
      remaining: limit,
      resetAt: Math.floor(Date.now() / 1000) + windowSeconds,
      limit,
    };
  }
}

/**
 * Reset rate limit for a key
 */
export async function resetRateLimit(key: string): Promise<void> {
  const client = getRedis();
  try {
    await client.del(`ratelimit:${key}`);
  } catch (error) {
    console.error('[RateLimit] Failed to reset:', error);
  }
}

// Pre-defined rate limit checks

/**
 * Check if user can create a new tenant
 * Limit: 3 tenants per day
 */
export async function canCreateTenant(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(
    `tenant:create:${userId}`,
    3, // 3 tenants max
    86400 // per day (24 hours)
  );
}

/**
 * Check if user can start/stop bots
 * Limit: 20 operations per hour
 */
export async function canOperateBot(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(
    `tenant:operate:${userId}`,
    20, // 20 operations
    3600 // per hour
  );
}

/**
 * Check if user can update credentials
 * Limit: 5 updates per hour
 */
export async function canUpdateCredentials(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(
    `tenant:credentials:${userId}`,
    5, // 5 updates
    3600 // per hour
  );
}

/**
 * Check API rate limit for a user
 * Limit: 100 requests per minute
 */
export async function canAccessApi(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(
    `api:access:${userId}`,
    100, // 100 requests
    60 // per minute
  );
}

/**
 * Apply rate limit headers to response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  };
}
