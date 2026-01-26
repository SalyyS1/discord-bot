/**
 * Subscription Status API
 * GET /api/guilds/[guildId]/subscription - Get subscription status
 */

import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { createFeatureGate, FREE_LIMITS } from '@repo/config';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const featureGate = createFeatureGate(redis, prisma);

type RouteParams = { params: Promise<{ guildId: string }> };

/**
 * GET - Get subscription status and features
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params;

  // Validate guild access
  const accessError = await validateGuildAccess(guildId);
  if (accessError) return accessError;

  // Get subscription
  const subscription = await prisma.subscription.findUnique({
    where: { guildId },
  });

  // Get status via FeatureGate (handles grace period expiration)
  const status = await featureGate.getStatus(guildId);
  const isPremium = await featureGate.isPremium(guildId);
  const availableFeatures = await featureGate.getAvailableFeatures(guildId);

  return ApiResponse.success({
    status,
    isPremium,
    features: availableFeatures,
    limits: isPremium ? null : FREE_LIMITS,
    subscription: subscription
      ? {
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          canceledAt: subscription.canceledAt,
          graceEndAt: subscription.graceEndAt,
        }
      : null,
  });
}
