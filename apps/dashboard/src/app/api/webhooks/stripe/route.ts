/**
 * Stripe Webhook Handler (Idempotent)
 * POST /api/webhooks/stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { createAuditLogger, ConfigPublisher, createFeatureGate } from '@repo/config';
import Redis from 'ioredis';
import {
  constructWebhookEvent,
  isEventProcessed,
  markEventProcessed,
  syncSubscription,
  handleSubscriptionDeleted,
  STRIPE_ENABLED,
} from '@/lib/stripe';
import { logger } from '@/lib/logger';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const configPublisher = new ConfigPublisher(redis);
const auditLog = createAuditLogger(prisma);
const featureGate = createFeatureGate(redis, prisma);

/**
 * POST - Handle Stripe webhook
 */
export async function POST(request: NextRequest) {
  if (!STRIPE_ENABLED) {
    return new NextResponse('Stripe not configured', { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new NextResponse('Missing stripe-signature header', { status: 400 });
  }

  const body = await request.text();
  const event = await constructWebhookEvent(body, signature) as { id: string; type: string; data: { object: unknown } } | null;

  if (!event) {
    return new NextResponse('Invalid signature', { status: 400 });
  }

  // IDEMPOTENCY CHECK
  const alreadyProcessed = await isEventProcessed(event.id);
  if (alreadyProcessed) {
    logger.debug(`Duplicate webhook ignored: ${event.id}`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Record event BEFORE processing (prevent race conditions)
  await markEventProcessed(event.id, event.type);

  try {
    let guildId: string | undefined;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as unknown as { metadata?: { guildId?: string } };
        guildId = session.metadata?.guildId;
        // Subscription will be handled by subscription.created
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        guildId = (subscription as unknown as { metadata?: { guildId?: string } }).metadata?.guildId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await syncSubscription(subscription as any);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        guildId = (subscription as unknown as { metadata?: { guildId?: string } }).metadata?.guildId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await handleSubscriptionDeleted(subscription as any);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        const subId = invoice.subscription as string | undefined;
        if (subId) {
          // Update subscription status
          const sub = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: subId },
          });
          if (sub) {
            guildId = sub.guildId;
            await prisma.subscription.update({
              where: { guildId },
              data: { status: 'PAST_DUE' },
            });
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        const subId = invoice.subscription as string | undefined;
        if (subId) {
          const sub = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: subId },
          });
          if (sub && sub.status === 'PAST_DUE') {
            guildId = sub.guildId;
            await prisma.subscription.update({
              where: { guildId },
              data: { status: 'ACTIVE' },
            });
          }
        }
        break;
      }

      default:
        logger.debug(`Unhandled event type: ${event.type}`);
    }

    // Invalidate cache and notify bot
    if (guildId) {
      await featureGate.invalidate(guildId);

      // Notify bot of subscription change
      try {
        await configPublisher.publish(guildId, 'SETTINGS');
      } catch (error) {
        logger.warn(`Failed to publish config update: ${error}`);
      }

      // Audit log
      try {
        await auditLog({
          guildId,
          userId: 'system',
          requestId: `stripe-${event.id}`,
          source: 'WEBHOOK',
          action: 'SUBSCRIPTION_UPGRADE', // Generic billing action
          category: 'BILLING',
          after: { eventType: event.type },
        });
      } catch (error) {
        logger.warn(`Audit log failed: ${error}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error(`Webhook error for ${event.id}: ${error}`);
    // Don't delete the event record - manual intervention needed
    return new NextResponse('Processing error', { status: 500 });
  }
}
