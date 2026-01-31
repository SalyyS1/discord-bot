/**
 * Centralized Feature Gating
 * CRITICAL: This is the ONLY place feature checks should happen
 */

import type Redis from 'ioredis';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export type SubscriptionStatus =
  | 'FREE'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'SUSPENDED'
  | 'CANCELED';

export type Feature =
  | 'CUSTOM_EMBEDS'
  | 'ADVANCED_TICKETS'
  | 'GIVEAWAY_REQUIREMENTS'
  | 'ANALYTICS_DASHBOARD'
  | 'AUDIT_LOGS'
  | 'UNLIMITED_AUTORESPONDERS'
  | 'CUSTOM_WELCOME_IMAGE'
  | 'PRIORITY_SUPPORT'
  | 'CUSTOM_MESSAGE_TEMPLATES';

// ═══════════════════════════════════════════════
// Feature Requirements
// ═══════════════════════════════════════════════

/**
 * Which subscription statuses grant access to which features
 */
const FEATURE_REQUIREMENTS: Record<Feature, SubscriptionStatus[]> = {
  CUSTOM_EMBEDS: ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'],
  ADVANCED_TICKETS: ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'],
  GIVEAWAY_REQUIREMENTS: ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'],
  ANALYTICS_DASHBOARD: ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'],
  AUDIT_LOGS: ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'],
  UNLIMITED_AUTORESPONDERS: ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'],
  CUSTOM_WELCOME_IMAGE: ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'],
  CUSTOM_MESSAGE_TEMPLATES: ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'],
  PRIORITY_SUPPORT: ['ACTIVE'], // Not available during grace period
};

// ═══════════════════════════════════════════════
// Free Tier Limits
// ═══════════════════════════════════════════════

export const FREE_LIMITS = {
  AUTORESPONDERS: 5,
  TICKET_PRODUCTS: 3,
  MESSAGE_TEMPLATES: 5,
  GIVEAWAY_WINNERS: 3,
  LEVEL_ROLES: 5,
} as const;

export type FreeLimitResource = keyof typeof FREE_LIMITS;

// ═══════════════════════════════════════════════
// Premium Statuses Helper
// ═══════════════════════════════════════════════

const PREMIUM_STATUSES: SubscriptionStatus[] = ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'];

export function isPremiumStatus(status: SubscriptionStatus): boolean {
  return PREMIUM_STATUSES.includes(status);
}

// ═══════════════════════════════════════════════
// Prisma-like interface (to avoid direct dependency)
// ═══════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaLike = any;

// ═══════════════════════════════════════════════
// FeatureGate Class
// ═══════════════════════════════════════════════

export class FeatureGate {
  private redis: Redis;
  private prisma: PrismaLike;
  private cacheTTL: number;

  private static CACHE_KEY = (guildId: string) => `subscription:status:${guildId}`;

  constructor(redis: Redis, prisma: PrismaLike, options?: { cacheTTL?: number }) {
    this.redis = redis;
    this.prisma = prisma;
    this.cacheTTL = options?.cacheTTL ?? 300; // 5 minutes default
  }

  /**
   * Check if a guild has access to a feature
   */
  async check(guildId: string, feature: Feature): Promise<boolean> {
    const status = await this.getStatus(guildId);
    const required = FEATURE_REQUIREMENTS[feature];
    return required.includes(status);
  }

  /**
   * Get subscription status (cached)
   */
  async getStatus(guildId: string): Promise<SubscriptionStatus> {
    const cacheKey = FeatureGate.CACHE_KEY(guildId);

    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return cached as SubscriptionStatus;
    }

    // Query database
    const subscription = await this.prisma.subscription.findUnique({
      where: { guildId },
    });

    let status: SubscriptionStatus = (subscription?.status as SubscriptionStatus) ?? 'FREE';

    // Check grace period expiration
    if (status === 'GRACE_PERIOD' && subscription?.graceEndAt) {
      if (new Date() > subscription.graceEndAt) {
        // Grace period expired, update to FREE
        await this.prisma.subscription.update({
          where: { guildId },
          data: { status: 'FREE' },
        });
        status = 'FREE';
      }
    }

    // Cache and return
    await this.redis.setex(cacheKey, this.cacheTTL, status);
    return status;
  }

  /**
   * Invalidate cache (call after subscription changes)
   */
  async invalidate(guildId: string): Promise<void> {
    await this.redis.del(FeatureGate.CACHE_KEY(guildId));
  }

  /**
   * Check if guild is premium
   */
  async isPremium(guildId: string): Promise<boolean> {
    const status = await this.getStatus(guildId);
    return isPremiumStatus(status);
  }

  /**
   * Check free tier limits
   */
  async checkLimit(
    guildId: string,
    resource: FreeLimitResource,
    currentCount: number
  ): Promise<{ allowed: boolean; limit: number | null; isPremium: boolean }> {
    const status = await this.getStatus(guildId);
    const premium = isPremiumStatus(status);

    if (premium) {
      return { allowed: true, limit: null, isPremium: true };
    }

    const limit = FREE_LIMITS[resource];
    return {
      allowed: currentCount < limit,
      limit,
      isPremium: false,
    };
  }

  /**
   * Get all available features for a guild
   */
  async getAvailableFeatures(guildId: string): Promise<Feature[]> {
    const status = await this.getStatus(guildId);
    return (Object.entries(FEATURE_REQUIREMENTS) as [Feature, SubscriptionStatus[]][])
      .filter(([, required]) => required.includes(status))
      .map(([feature]) => feature);
  }
}

// ═══════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════

let featureGateInstance: FeatureGate | null = null;

/**
 * Create or get singleton FeatureGate instance
 */
export function createFeatureGate(
  redis: Redis,
  prisma: PrismaLike,
  options?: { cacheTTL?: number }
): FeatureGate {
  if (!featureGateInstance) {
    featureGateInstance = new FeatureGate(redis, prisma, options);
  }
  return featureGateInstance;
}

/**
 * Get existing FeatureGate instance (must be created first)
 */
export function getFeatureGate(): FeatureGate {
  if (!featureGateInstance) {
    throw new Error('FeatureGate not initialized. Call createFeatureGate first.');
  }
  return featureGateInstance;
}
