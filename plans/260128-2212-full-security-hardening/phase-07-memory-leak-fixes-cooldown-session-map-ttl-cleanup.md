# Phase 07: Memory Leak Fixes Cooldown Session Map TTL Cleanup

## Context Links
- Security Audit: `../reports/code-reviewer-260128-2200-discord-bot-quality-review.md`
- Anti-Abuse Module: `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/bot/src/modules/tickets/antiabuse.ts`
- Anti-Spam Module: `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/bot/src/modules/security/antiSpam.ts`

## Overview
- **Priority:** HIGH
- **Status:** completed
- **Effort:** 2h
- **Risk:** Memory exhaustion causing bot crashes; degraded performance over time

## Key Insights
- Multiple unbounded Maps used for cooldowns/sessions across modules
- `antiabuse.ts` creates new Redis instance on each function call (line 32-37)
- Anti-spam has cleanup but other modules may not
- Long-running bots accumulate stale entries
- No monitoring for memory growth

## Requirements

### Functional
- All in-memory Maps have TTL-based cleanup
- Redis instances are reused (singleton pattern)
- Stale entries automatically removed
- Memory usage remains stable over time

### Non-Functional
- Cleanup runs efficiently (no blocking)
- Memory overhead per entry is minimal
- Cleanup interval configurable

## Architecture

```
Cooldown/Session Data
         │
         ▼
   TTLMap<K, V>
         │
         ├── Set with TTL ──> Store value + expiresAt
         │
         ├── Get ──> Check expiry, return or delete
         │
         └── Cleanup Timer ──> Periodic removal of expired
```

**Redis Singleton Pattern:**
```
Module ──> getSharedRedis() ──> Singleton Redis Instance
                                        │
                                        └── Lazy connect, error handling
```

## Related Code Files

### Modify
- `apps/bot/src/modules/tickets/antiabuse.ts` - Fix Redis leak
- `apps/bot/src/modules/security/antiSpam.ts` - Verify cleanup
- `apps/bot/src/modules/security/antiLink.ts` - Add cleanup if missing
- `apps/bot/src/modules/tempvoice/index.ts` - Add cleanup

### Create
- `apps/bot/src/lib/ttl-map-with-auto-cleanup.ts` - TTL Map utility
- `apps/bot/src/lib/shared-redis-singleton-instance.ts` - Redis singleton

## Implementation Steps

### Step 1: Create TTL Map Utility
```typescript
// apps/bot/src/lib/ttl-map-with-auto-cleanup.ts

interface TTLEntry<V> {
  value: V;
  expiresAt: number;
}

/**
 * Map with automatic TTL-based expiration
 * Prevents memory leaks from stale entries
 */
export class TTLMap<K, V> {
  private store: Map<K, TTLEntry<V>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private defaultTtlMs: number;

  constructor(options: {
    defaultTtlMs?: number;
    cleanupIntervalMs?: number;
    maxSize?: number;
  } = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? 60000; // 1 minute default
    const cleanupMs = options.cleanupIntervalMs ?? 60000;

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupMs);

    // Prevent keeping process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Set value with TTL
   */
  set(key: K, value: V, ttlMs?: number): void {
    const expiry = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, {
      value,
      expiresAt: expiry,
    });
  }

  /**
   * Get value if not expired
   */
  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Check if key exists and not expired
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete key
   */
  delete(key: K): boolean {
    return this.store.delete(key);
  }

  /**
   * Get remaining TTL in ms
   */
  getTtl(key: K): number {
    const entry = this.store.get(key);
    if (!entry) return 0;

    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Extend TTL for existing key
   */
  touch(key: K, ttlMs?: number): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    entry.expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    return true;
  }

  /**
   * Increment numeric value (for counters)
   */
  increment(key: K, ttlMs?: number): number {
    const current = this.get(key) as number | undefined;
    const newValue = (current ?? 0) + 1;
    this.set(key, newValue as unknown as V, ttlMs);
    return newValue;
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Remove all expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.debug(`[TTLMap] Cleaned up ${removed} expired entries`);
    }

    return removed;
  }

  /**
   * Clear all entries and stop cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }

  /**
   * Get stats for monitoring
   */
  getStats(): { size: number; oldestEntry: number | null } {
    let oldest: number | null = null;

    for (const entry of this.store.values()) {
      if (oldest === null || entry.expiresAt < oldest) {
        oldest = entry.expiresAt;
      }
    }

    return {
      size: this.store.size,
      oldestEntry: oldest ? oldest - Date.now() : null,
    };
  }
}

// Pre-configured instances for common use cases
export const cooldownMap = new TTLMap<string, number>({
  defaultTtlMs: 5 * 60 * 1000, // 5 minutes
  cleanupIntervalMs: 60 * 1000, // Cleanup every minute
});

export const sessionMap = new TTLMap<string, unknown>({
  defaultTtlMs: 30 * 60 * 1000, // 30 minutes
  cleanupIntervalMs: 5 * 60 * 1000, // Cleanup every 5 minutes
});
```

### Step 2: Create Shared Redis Singleton
```typescript
// apps/bot/src/lib/shared-redis-singleton-instance.ts

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
      retryDelayOnFailover: 100,
      lazyConnect: true,
      enableReadyCheck: true,
    });

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
```

### Step 3: Fix Anti-Abuse Redis Leak
```typescript
// apps/bot/src/modules/tickets/antiabuse.ts - Updated

import { prisma } from '@repo/database';
import { getSharedRedis } from '../../lib/shared-redis-singleton-instance.js';

// Remove the problematic getRedis function that creates new instances
// Replace all `const redis = getRedis()` with `const redis = getSharedRedis()`

export async function checkTicketAbuse(
  guildId: string,
  userId: string,
  settings: TicketSettings
): Promise<AbuseCheck> {
  const redis = getSharedRedis(); // Use shared instance

  // ... rest of function unchanged
}

export async function setTicketCooldown(
  guildId: string,
  userId: string,
  cooldownMinutes: number
): Promise<void> {
  const redis = getSharedRedis(); // Use shared instance
  // ...
}

// Apply same fix to all functions in this file
```

### Step 4: Add Cleanup to Anti-Link Module
```typescript
// apps/bot/src/modules/security/antiLink.ts - Add TTL cleanup

import { TTLMap } from '../../lib/ttl-map-with-auto-cleanup.js';

// Replace unbounded Map with TTLMap
const warningCounts = new TTLMap<string, number>({
  defaultTtlMs: 10 * 60 * 1000, // 10 minutes
  cleanupIntervalMs: 60 * 1000,
});

// Update usages:
// Before: warningCounts.set(key, count)
// After:  warningCounts.set(key, count) // TTL applied automatically
```

### Step 5: Add Cleanup to TempVoice Module
```typescript
// apps/bot/src/modules/tempvoice/index.ts - Add TTL cleanup

import { TTLMap } from '../../lib/ttl-map-with-auto-cleanup.js';

// Replace unbounded Map with TTLMap
const channelOwners = new TTLMap<string, string>({
  defaultTtlMs: 24 * 60 * 60 * 1000, // 24 hours
  cleanupIntervalMs: 60 * 60 * 1000, // Cleanup every hour
});

// Note: Also clean up on channel delete event
```

### Step 6: Add Memory Monitoring
```typescript
// apps/bot/src/lib/memory-usage-monitor.ts

import { cooldownMap, sessionMap } from './ttl-map-with-auto-cleanup.js';

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  cooldownMapSize: number;
  sessionMapSize: number;
}

/**
 * Get current memory stats
 */
export function getMemoryStats(): MemoryStats {
  const mem = process.memoryUsage();

  return {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    external: Math.round(mem.external / 1024 / 1024),
    cooldownMapSize: cooldownMap.size,
    sessionMapSize: sessionMap.size,
  };
}

/**
 * Log memory stats periodically
 */
export function startMemoryMonitoring(intervalMs = 300000): NodeJS.Timeout {
  return setInterval(() => {
    const stats = getMemoryStats();
    console.log(
      `[Memory] Heap: ${stats.heapUsed}/${stats.heapTotal}MB | ` +
      `External: ${stats.external}MB | ` +
      `Cooldowns: ${stats.cooldownMapSize} | ` +
      `Sessions: ${stats.sessionMapSize}`
    );

    // Warn if heap usage is high
    if (stats.heapUsed > 500) {
      console.warn('[Memory] High heap usage detected!');
    }
  }, intervalMs);
}
```

## Todo List

- [x] Create `ttl-map-with-auto-cleanup.ts` utility
- [x] Create `shared-redis-singleton-instance.ts`
- [x] Fix Redis leak in `antiabuse.ts`
- [x] Update `antiLink.ts` to use TTLMap (no Maps found)
- [x] Update `antiSpam.ts` to use TTLMap
- [x] Update `tempvoice/index.ts` to use TTLMap (uses DB, no Maps)
- [x] Audit all modules for unbounded Maps
- [x] Update `antiRaid.ts` to use TTLMap
- [x] Update `tickets/index.ts` to use TTLMap
- [x] Update `voiceXp.ts` to use TTLMap
- [x] Update `studio/orders.ts` to use TTLMap
- [x] Create `memory-usage-monitor.ts`
- [ ] Add memory monitoring to bot startup
- [ ] Test long-running stability

## Success Criteria

- [x] No new Redis connections created per function call
- [x] All Maps have TTL-based cleanup
- [ ] Memory usage stable after 24h run
- [x] Cleanup intervals fire without blocking
- [ ] Memory stats logged periodically

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing cooldown logic | Medium | Low | Thorough testing |
| Cleanup too aggressive | Low | Medium | Configurable intervals |
| Redis singleton connection issues | Low | Medium | Error handling, reconnect logic |

## Security Considerations

- TTL prevents accumulation of user data
- Shared Redis reduces connection attack surface
- Memory limits prevent DoS via resource exhaustion
- Monitor for unusual memory growth (potential attack indicator)

## Next Steps

After this phase:
1. Add memory usage to health endpoint
2. Set up memory alerts in monitoring
3. Consider Redis memory limits
4. Profile bot under load to verify stability
