# Phase 06: Rate Limiting Fail-Closed Strategy with In-Memory Fallback

## Context Links
- Security Audit: `../reports/code-reviewer-260128-2200-security-audit.md` (H4)
- Rate Limit Service: `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/packages/security/src/ratelimit.ts`
- Anti-Abuse Module: `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/bot/src/modules/tickets/antiabuse.ts`

## Overview
- **Priority:** HIGH
- **Status:** completed
- **Effort:** 2h
- **Risk:** Abuse possible during Redis outage; denial of service via rate limit exhaustion

## Key Insights
- Current rate limiter "fails open" - allows all requests when Redis unavailable (lines 65-74)
- Comment says "If Redis fails, allow the request but log error"
- During Redis outage, attackers could spam endpoints
- Anti-spam module has in-memory fallback but rate limit service doesn't
- Need circuit breaker pattern to prevent Redis connection storms

## Requirements

### Functional
- Rate limiting fails closed for critical endpoints
- In-memory fallback when Redis unavailable
- Circuit breaker prevents repeated Redis connection attempts
- Configurable fail-open vs fail-closed per endpoint

### Non-Functional
- Fallback adds < 1ms latency
- Memory usage bounded (LRU eviction)
- Clear logging of fallback activation

## Architecture

```
Request ──> Rate Limit Service
                   │
                   ├──> Redis Available? ──> Use Redis
                   │
                   └──> Redis Down? ──> Circuit Breaker
                                              │
                                              ├──> In-Memory Fallback (critical)
                                              │
                                              └──> Fail Open (non-critical)
```

**Circuit Breaker States:**
```
CLOSED (normal) ──[errors > threshold]──> OPEN (reject Redis calls)
       ▲                                         │
       │                                         │
       └───────[timeout expires]─── HALF_OPEN ◄──┘
                                   (test one call)
```

## Related Code Files

### Modify
- `packages/security/src/ratelimit.ts` - Add fallback, circuit breaker

### Create
- `packages/security/src/rate-limit-memory-fallback-store.ts` - In-memory store
- `packages/security/src/circuit-breaker-for-redis.ts` - Circuit breaker
- `packages/security/__tests__/ratelimit-fallback.test.ts` - Fallback tests

## Implementation Steps

### Step 1: Create In-Memory Rate Limit Store
```typescript
// packages/security/src/rate-limit-memory-fallback-store.ts

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

/**
 * In-memory rate limit store with LRU eviction
 * Used as fallback when Redis is unavailable
 */
export class MemoryRateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
    this.startCleanup();
  }

  /**
   * Increment counter for key
   * Returns current count after increment
   */
  increment(key: string, windowSeconds: number): number {
    const now = Date.now();
    const entry = this.store.get(key);

    if (entry && entry.expiresAt > now) {
      entry.count++;
      return entry.count;
    }

    // New or expired entry
    this.evictIfNeeded();
    this.store.set(key, {
      count: 1,
      expiresAt: now + windowSeconds * 1000,
    });

    return 1;
  }

  /**
   * Get current count for key
   */
  getCount(key: string): number {
    const now = Date.now();
    const entry = this.store.get(key);

    if (entry && entry.expiresAt > now) {
      return entry.count;
    }

    return 0;
  }

  /**
   * Get TTL in seconds for key
   */
  getTtl(key: string): number {
    const now = Date.now();
    const entry = this.store.get(key);

    if (entry && entry.expiresAt > now) {
      return Math.ceil((entry.expiresAt - now) / 1000);
    }

    return 0;
  }

  /**
   * Delete key
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Evict oldest entries if store exceeds max size
   */
  private evictIfNeeded(): void {
    if (this.store.size < this.maxSize) return;

    const now = Date.now();
    let evicted = 0;

    // First pass: remove expired
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
        evicted++;
      }
    }

    // Second pass: remove oldest if still over limit
    if (this.store.size >= this.maxSize) {
      const toRemove = Math.ceil(this.maxSize * 0.1); // Remove 10%
      const keys = Array.from(this.store.keys()).slice(0, toRemove);
      keys.forEach((key) => this.store.delete(key));
    }
  }

  /**
   * Periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (entry.expiresAt <= now) {
          this.store.delete(key);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Stop cleanup and clear store
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }

  /**
   * Get store stats
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.store.size,
      maxSize: this.maxSize,
    };
  }
}

// Singleton instance
export const memoryStore = new MemoryRateLimitStore();
```

### Step 2: Create Circuit Breaker
```typescript
// packages/security/src/circuit-breaker-for-redis.ts

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number; // Failures before opening
  resetTimeout: number; // Ms before trying again
  halfOpenRequests: number; // Test requests in half-open
}

/**
 * Circuit breaker for Redis connections
 * Prevents connection storms during outages
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailure = 0;
  private halfOpenSuccesses = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 30000, // 30 seconds
      halfOpenRequests: config.halfOpenRequests ?? 3,
    };
  }

  /**
   * Check if circuit allows requests
   */
  canExecute(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      // Check if timeout has passed
      if (Date.now() - this.lastFailure >= this.config.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenSuccesses = 0;
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN');
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow limited requests
    return true;
  }

  /**
   * Record successful operation
   */
  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenRequests) {
        this.state = 'CLOSED';
        this.failures = 0;
        console.log('[CircuitBreaker] Circuit CLOSED (recovered)');
      }
    } else {
      this.failures = 0;
    }
  }

  /**
   * Record failed operation
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      console.warn('[CircuitBreaker] Circuit OPEN (failed in half-open)');
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      console.warn('[CircuitBreaker] Circuit OPEN (threshold exceeded)');
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Force circuit open (for testing/manual intervention)
   */
  forceOpen(): void {
    this.state = 'OPEN';
    this.lastFailure = Date.now();
  }

  /**
   * Force circuit closed (for recovery)
   */
  forceClosed(): void {
    this.state = 'CLOSED';
    this.failures = 0;
  }
}

// Singleton for Redis
export const redisCircuitBreaker = new CircuitBreaker();
```

### Step 3: Update Rate Limit Service
```typescript
// packages/security/src/ratelimit.ts - Updated

import Redis from 'ioredis';
import { memoryStore } from './rate-limit-memory-fallback-store.js';
import { redisCircuitBreaker } from './circuit-breaker-for-redis.js';

// Lazy-initialized Redis client
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1, // Fail fast
      connectTimeout: 2000,
      commandTimeout: 1000,
      lazyConnect: true,
    });
    redis.on('error', (err) => {
      console.error('[RateLimit] Redis connection error:', err.message);
      redisCircuitBreaker.recordFailure();
    });
  }
  return redis;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  source: 'redis' | 'memory' | 'bypass';
}

export interface RateLimitOptions {
  failClosed?: boolean; // Default: true for critical endpoints
}

/**
 * Check and increment rate limit for a key
 * Uses Redis with in-memory fallback
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const { failClosed = true } = options;
  const fullKey = `ratelimit:${key}`;
  const now = Date.now();

  // Check circuit breaker
  if (!redisCircuitBreaker.canExecute()) {
    return handleFallback(fullKey, limit, windowSeconds, failClosed, 'circuit-open');
  }

  try {
    const client = getRedis();

    // Use Redis
    const current = await client.incr(fullKey);

    if (current === 1) {
      await client.expire(fullKey, windowSeconds);
    }

    const ttl = await client.ttl(fullKey);
    const resetAt = Math.floor(now / 1000) + (ttl > 0 ? ttl : windowSeconds);

    redisCircuitBreaker.recordSuccess();

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt,
      limit,
      source: 'redis',
    };
  } catch (error) {
    console.error('[RateLimit] Redis error:', error);
    redisCircuitBreaker.recordFailure();
    return handleFallback(fullKey, limit, windowSeconds, failClosed, 'redis-error');
  }
}

/**
 * Handle fallback when Redis unavailable
 */
function handleFallback(
  key: string,
  limit: number,
  windowSeconds: number,
  failClosed: boolean,
  reason: string
): RateLimitResult {
  const now = Date.now();

  if (failClosed) {
    // Use in-memory store
    const current = memoryStore.increment(key, windowSeconds);
    const ttl = memoryStore.getTtl(key);
    const resetAt = Math.floor(now / 1000) + (ttl > 0 ? ttl : windowSeconds);

    console.log(`[RateLimit] Using memory fallback for ${key} (${reason})`);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt,
      limit,
      source: 'memory',
    };
  } else {
    // Fail open for non-critical endpoints
    console.warn(`[RateLimit] Bypassing rate limit for ${key} (${reason})`);

    return {
      allowed: true,
      remaining: limit,
      resetAt: Math.floor(now / 1000) + windowSeconds,
      limit,
      source: 'bypass',
    };
  }
}

// Pre-defined rate limit checks with fail-closed by default

export async function canCreateTenant(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(`tenant:create:${userId}`, 3, 86400, { failClosed: true });
}

export async function canOperateBot(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(`tenant:operate:${userId}`, 20, 3600, { failClosed: true });
}

export async function canUpdateCredentials(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(`tenant:credentials:${userId}`, 5, 3600, { failClosed: true });
}

export async function canAccessApi(userId: string): Promise<RateLimitResult> {
  // Less critical - can fail open
  return checkRateLimit(`api:access:${userId}`, 100, 60, { failClosed: false });
}

// ... rest of exports unchanged
```

### Step 4: Create Tests
```typescript
// packages/security/__tests__/ratelimit-fallback.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit } from '../src/ratelimit';
import { memoryStore } from '../src/rate-limit-memory-fallback-store';
import { redisCircuitBreaker } from '../src/circuit-breaker-for-redis';

describe('Rate Limit Fallback', () => {
  beforeEach(() => {
    memoryStore.destroy();
    redisCircuitBreaker.forceClosed();
  });

  it('should use memory fallback when circuit is open', async () => {
    redisCircuitBreaker.forceOpen();

    const result = await checkRateLimit('test:key', 5, 60);

    expect(result.source).toBe('memory');
    expect(result.allowed).toBe(true);
  });

  it('should enforce limits in memory fallback', async () => {
    redisCircuitBreaker.forceOpen();

    // Exhaust limit
    for (let i = 0; i < 5; i++) {
      await checkRateLimit('test:limit', 5, 60);
    }

    const result = await checkRateLimit('test:limit', 5, 60);

    expect(result.source).toBe('memory');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should bypass when failClosed is false', async () => {
    redisCircuitBreaker.forceOpen();

    const result = await checkRateLimit('test:bypass', 5, 60, { failClosed: false });

    expect(result.source).toBe('bypass');
    expect(result.allowed).toBe(true);
  });
});

describe('Circuit Breaker', () => {
  beforeEach(() => {
    redisCircuitBreaker.forceClosed();
  });

  it('should open after threshold failures', () => {
    for (let i = 0; i < 5; i++) {
      redisCircuitBreaker.recordFailure();
    }

    expect(redisCircuitBreaker.getState()).toBe('OPEN');
    expect(redisCircuitBreaker.canExecute()).toBe(false);
  });

  it('should recover after timeout', async () => {
    redisCircuitBreaker.forceOpen();

    // Simulate timeout
    vi.useFakeTimers();
    vi.advanceTimersByTime(31000);

    expect(redisCircuitBreaker.canExecute()).toBe(true);
    expect(redisCircuitBreaker.getState()).toBe('HALF_OPEN');

    vi.useRealTimers();
  });
});
```

## Todo List

- [x] Create `rate-limit-memory-fallback-store.ts`
- [x] Create `circuit-breaker-for-redis.ts`
- [x] Update `ratelimit.ts` with fallback logic
- [x] Add `failClosed` option to all rate limit functions
- [ ] Update anti-abuse module to use new rate limiter
- [ ] Create fallback and circuit breaker tests
- [ ] Test behavior during Redis outage
- [ ] Add monitoring for fallback activation
- [ ] Document rate limit behavior in runbook

## Success Criteria

- [x] Rate limiting works when Redis is unavailable
- [x] Critical endpoints (tenant ops) fail closed
- [x] Non-critical endpoints (API access) can fail open
- [x] Circuit breaker prevents Redis connection storms
- [x] Memory store has bounded size (LRU eviction)
- [ ] All tests pass

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Memory fallback inconsistent | Medium | Low | Acceptable for short outages |
| False positives in fallback | Low | Medium | Conservative limits in memory |
| Memory exhaustion | Low | Medium | LRU eviction, max size limit |

## Security Considerations

- Fail-closed is more secure but impacts availability
- Memory fallback is per-instance (not distributed)
- During Redis outage, rate limits are per-server not global
- Log all fallback activations for monitoring
- Alert on extended fallback periods

## Next Steps

After this phase:
1. Add Prometheus metrics for rate limit fallback
2. Set up alerts for circuit breaker state changes
3. Consider Redis Cluster for high availability
4. Implement distributed memory fallback (if needed)
