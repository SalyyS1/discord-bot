/**
 * Rate Limiting Service using Redis
 * Protects against abuse and ensures fair resource usage
 * Features fail-closed strategy with in-memory fallback
 */

import Redis from 'ioredis';
import { memoryStore } from './rate-limit-memory-fallback-store';
import { redisCircuitBreaker } from './circuit-breaker-for-redis';
import { rateLimitRequestsTotal, rateLimitRejectedTotal } from './prometheus-metrics-registry';

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

export interface RateLimitOptions {
  failClosed?: boolean; // If true, use memory fallback; if false, allow on Redis failure
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp when window resets
  limit: number;
  source: 'redis' | 'memory' | 'bypass'; // Where the limit was checked
}

/**
 * Handle fallback when Redis is unavailable
 */
function handleFallback(
  key: string,
  limit: number,
  windowSeconds: number,
  failClosed: boolean,
  reason: string
): RateLimitResult {
  if (!failClosed) {
    // Fail open: allow request
    console.warn(`[RateLimit] ${reason}, failing open for ${key}`);
    return {
      allowed: true,
      remaining: limit,
      resetAt: Math.floor(Date.now() / 1000) + windowSeconds,
      limit,
      source: 'bypass',
    };
  }

  // Fail closed: use memory fallback
  console.warn(`[RateLimit] ${reason}, using memory fallback for ${key}`);
  const fullKey = `ratelimit:${key}`;
  const current = memoryStore.increment(fullKey, windowSeconds);
  const ttl = memoryStore.getTtl(fullKey);
  const resetAt = Math.floor(Date.now() / 1000) + ttl;

  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    resetAt,
    limit,
    source: 'memory',
  };
}

/**
 * Check and increment rate limit for a key
 * @param key - Unique identifier for the rate limit bucket
 * @param limit - Maximum number of requests allowed in window
 * @param windowSeconds - Duration of the rate limit window in seconds
 * @param options - Configuration options (failClosed behavior)
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const { failClosed = true } = options;
  const fullKey = `ratelimit:${key}`;

  // Check circuit breaker before attempting Redis call
  if (!redisCircuitBreaker.canExecute()) {
    return handleFallback(key, limit, windowSeconds, failClosed, 'Circuit breaker OPEN');
  }

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

    // Record success with circuit breaker
    redisCircuitBreaker.recordSuccess();

    const result = {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt,
      limit,
      source: 'redis' as const,
    };

    // Record metrics
    rateLimitRequestsTotal.inc({
      allowed: result.allowed ? 'true' : 'false',
      source: result.source,
    });

    if (!result.allowed) {
      const keyPrefix = key.split(':')[0] || 'unknown';
      rateLimitRejectedTotal.inc({ key_prefix: keyPrefix });
    }

    return result;
  } catch (error) {
    // Record failure with circuit breaker
    redisCircuitBreaker.recordFailure();
    console.error('[RateLimit] Redis error:', error);

    const fallbackResult = handleFallback(key, limit, windowSeconds, failClosed, 'Redis error');

    // Record metrics for fallback
    rateLimitRequestsTotal.inc({
      allowed: fallbackResult.allowed ? 'true' : 'false',
      source: fallbackResult.source,
    });

    if (!fallbackResult.allowed) {
      const keyPrefix = key.split(':')[0] || 'unknown';
      rateLimitRejectedTotal.inc({ key_prefix: keyPrefix });
    }

    return fallbackResult;
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
 * CRITICAL: Fail-closed (use memory fallback if Redis unavailable)
 */
export async function canCreateTenant(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(
    `tenant:create:${userId}`,
    3, // 3 tenants max
    86400, // per day (24 hours)
    { failClosed: true } // Critical operation
  );
}

/**
 * Check if user can start/stop bots
 * Limit: 20 operations per hour
 * CRITICAL: Fail-closed (use memory fallback if Redis unavailable)
 */
export async function canOperateBot(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(
    `tenant:operate:${userId}`,
    20, // 20 operations
    3600, // per hour
    { failClosed: true } // Critical operation
  );
}

/**
 * Check if user can update credentials
 * Limit: 5 updates per hour
 * CRITICAL: Fail-closed (use memory fallback if Redis unavailable)
 */
export async function canUpdateCredentials(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(
    `tenant:credentials:${userId}`,
    5, // 5 updates
    3600, // per hour
    { failClosed: true } // Critical operation - prevents brute force
  );
}

/**
 * Check API rate limit for a user
 * Limit: 100 requests per minute
 * Non-critical: Fail-open (allow if Redis unavailable)
 */
export async function canAccessApi(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(
    `api:access:${userId}`,
    100, // 100 requests
    60, // per minute
    { failClosed: false } // Non-critical - prefer availability
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
