/**
 * Versioned Cache System
 * Provides cache with version-based invalidation to prevent stale reads
 */

import type { Redis } from 'ioredis';

export interface CacheConfig {
  defaultTTL: number; // seconds
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 300, // 5 minutes
};

/**
 * Versioned cache for guild settings
 * Uses version numbers to ensure cache invalidation works correctly
 */
export class SettingsCache {
  private redis: Redis;
  private config: CacheConfig;

  private static VERSION_KEY = (guildId: string) => `settings:version:${guildId}`;
  private static DATA_KEY = (guildId: string, version: number) =>
    `settings:${guildId}:v${version}`;

  constructor(redis: Redis, config: Partial<CacheConfig> = {}) {
    this.redis = redis;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get cached settings with version validation
   * Returns null if cache miss or version mismatch
   */
  async get<T>(guildId: string): Promise<T | null> {
    try {
      const versionStr = await this.redis.get(SettingsCache.VERSION_KEY(guildId));
      if (!versionStr) return null;

      const version = parseInt(versionStr, 10);
      const cached = await this.redis.get(SettingsCache.DATA_KEY(guildId, version));

      if (!cached) return null;
      return JSON.parse(cached) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set cache with new version number
   * Automatically increments version to invalidate old entries
   */
  async set<T>(guildId: string, data: T, ttl?: number): Promise<void> {
    const effectiveTTL = ttl ?? this.config.defaultTTL;

    try {
      // Increment version (creates key with value 1 if doesn't exist)
      const version = await this.redis.incr(SettingsCache.VERSION_KEY(guildId));

      // Store data with version
      await this.redis.setex(
        SettingsCache.DATA_KEY(guildId, version),
        effectiveTTL,
        JSON.stringify(data)
      );
    } catch {
      // Silent fail - cache is optional
    }
  }

  /**
   * Invalidate cache by incrementing version
   * Old versioned keys expire naturally via TTL
   */
  async invalidate(guildId: string): Promise<void> {
    try {
      await this.redis.incr(SettingsCache.VERSION_KEY(guildId));
    } catch {
      // Silent fail
    }
  }

  /**
   * Force clear all cache keys for a guild (use sparingly)
   */
  async clear(guildId: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`settings:${guildId}:*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      await this.redis.del(SettingsCache.VERSION_KEY(guildId));
    } catch {
      // Silent fail
    }
  }

  /**
   * Get or fetch pattern - cache-aside with version safety
   */
  async getOrFetch<T>(
    guildId: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(guildId);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const data = await fetcher();

    // Store in cache (don't await to avoid blocking)
    this.set(guildId, data, ttl).catch(() => {});

    return data;
  }
}

/**
 * Generic cache utility for non-settings data
 */
export class GenericCache {
  private redis: Redis;
  private prefix: string;
  private defaultTTL: number;

  constructor(redis: Redis, prefix: string, defaultTTL = 300) {
    this.redis = redis;
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
  }

  private key(id: string): string {
    return `${this.prefix}:${id}`;
  }

  async get<T>(id: string): Promise<T | null> {
    try {
      const data = await this.redis.get(this.key(id));
      return data ? (JSON.parse(data) as T) : null;
    } catch {
      return null;
    }
  }

  async set<T>(id: string, data: T, ttl?: number): Promise<void> {
    try {
      await this.redis.setex(this.key(id), ttl ?? this.defaultTTL, JSON.stringify(data));
    } catch {
      // Silent fail
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.redis.del(this.key(id));
    } catch {
      // Silent fail
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      return (await this.redis.exists(this.key(id))) === 1;
    } catch {
      return false;
    }
  }
}
