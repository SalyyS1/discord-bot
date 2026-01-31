/**
 * TTL Map with Auto Cleanup
 * Prevents memory leaks from stale entries
 */

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
   * Get iterator of values (with expiry check)
   */
  *values(): IterableIterator<V> {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      } else {
        yield entry.value;
      }
    }
  }

  /**
   * Get iterator of keys (with expiry check)
   */
  *keys(): IterableIterator<K> {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      } else {
        yield key;
      }
    }
  }

  /**
   * Get iterator of entries (with expiry check)
   */
  *entries(): IterableIterator<[K, V]> {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      } else {
        yield [key, entry.value];
      }
    }
  }

  /**
   * Remove all expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
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

    const values = Array.from(this.store.values());
    for (const entry of values) {
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
