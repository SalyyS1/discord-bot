/**
 * In-Memory Rate Limit Store
 * Fallback store when Redis is unavailable
 * Uses LRU eviction to prevent unbounded memory growth
 */

import { memoryStoreEntries, memoryStoreMaxSize } from './prometheus-metrics-registry';

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

export class MemoryRateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly maxSize: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
    memoryStoreMaxSize.set(maxSize);
    this.startCleanup();
  }

  /**
   * Increment counter for a key within a time window
   * @returns Current count after increment
   */
  increment(key: string, windowSeconds: number): number {
    const now = Date.now();
    const entry = this.store.get(key);

    if (entry && entry.expiresAt > now) {
      entry.count++;
      return entry.count;
    }

    this.evictIfNeeded();
    this.store.set(key, {
      count: 1,
      expiresAt: now + windowSeconds * 1000,
    });

    memoryStoreEntries.set(this.store.size);
    return 1;
  }

  /**
   * Get current count for a key
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
   * Get time-to-live for a key in seconds
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
   * Evict expired entries and apply LRU when at capacity
   */
  private evictIfNeeded(): void {
    if (this.store.size < this.maxSize) return;

    const now = Date.now();
    // First pass: remove expired entries
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }

    // Second pass: if still at capacity, remove 10% oldest entries
    if (this.store.size >= this.maxSize) {
      const toRemove = Math.ceil(this.maxSize * 0.1);
      const keys = Array.from(this.store.keys()).slice(0, toRemove);
      keys.forEach((key) => this.store.delete(key));
    }

    memoryStoreEntries.set(this.store.size);
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (entry.expiresAt <= now) {
          this.store.delete(key);
        }
      }
      memoryStoreEntries.set(this.store.size);
    }, 60000); // Run cleanup every minute
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }

  /**
   * Get store statistics
   */
  getStats(): { size: number; maxSize: number } {
    return { size: this.store.size, maxSize: this.maxSize };
  }
}

// Singleton instance
export const memoryStore = new MemoryRateLimitStore();
