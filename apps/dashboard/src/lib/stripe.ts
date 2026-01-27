/**
 * Stripe Billing Integration
 * Handles subscriptions, webhooks, and status mapping
 * Uses lazy loading to avoid build-time errors when key not set
 */

import { prisma } from '@repo/database';
import type { SubscriptionStatus } from '@repo/config';

// ═══════════════════════════════════════════════
// Lazy Stripe Client
// ═══════════════════════════════════════════════

let _stripe: import('stripe').default | null = null;

export const STRIPE_ENABLED = !!process.env.STRIPE_SECRET_KEY;

/**
 * Get Stripe client (lazy loaded)
 */
export async function getStripe(): Promise<import('stripe').default | null> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  if (!_stripe) {
    const Stripe = (await import('stripe')).default;
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return _stripe;
}

// For backwards compatibility (sync version, returns cached or null)
export const stripe = null; // Will be null at module load, use getStripe() instead

// ═══════════════════════════════════════════════
// Status Mapping
// ═══════════════════════════════════════════════

type StripeSubscription = {
  status: string;
  canceled_at?: number | null;
  cancel_at_period_end: boolean;
  metadata: { guildId?: string };
  customer: string | { id: string };
  id: string;
  items: { data: Array<{ price: { id: string } }> };
};

/**
 * Map Stripe subscription status to internal status
 */
export function mapStripeStatus(subscription: StripeSubscription): SubscriptionStatus {
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      return 'ACTIVE';

    case 'past_due':
      return 'PAST_DUE';

    case 'canceled': {
      // Check if within 3-day grace period
      if (subscription.canceled_at) {
        const graceDays = 3;
        const graceEndTimestamp = subscription.canceled_at + graceDays * 24 * 60 * 60;
        if (Date.now() / 1000 < graceEndTimestamp) {
          return 'GRACE_PERIOD';
        }
      }
      return 'CANCELED';
    }

    case 'unpaid':
      return 'SUSPENDED';

    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'FREE';
  }
}

// ═══════════════════════════════════════════════
// Webhook Idempotency
// ═══════════════════════════════════════════════

/**
 * Check if a webhook event has already been processed
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  const existing = await prisma.stripeEvent.findUnique({
    where: { id: eventId },
  });
  return !!existing;
}

/**
 * Mark a webhook event as processed
 * MUST be called BEFORE processing to prevent race conditions
 */
export async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  await prisma.stripeEvent.create({
    data: { id: eventId, type: eventType },
  });
}

// ═══════════════════════════════════════════════
// Subscription Management
// ═══════════════════════════════════════════════

/**
 * Update subscription record from Stripe data
 */
export async function syncSubscription(subscription: StripeSubscription): Promise<void> {
  const guildId = subscription.metadata.guildId;
  if (!guildId) {
    console.warn('[Stripe] Subscription missing guildId metadata:', subscription.id);
    return;
  }

  const internalStatus = mapStripeStatus(subscription);
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  // Calculate grace end date (3 days after cancellation)
  let graceEndAt: Date | null = null;
  if (subscription.canceled_at) {
    graceEndAt = new Date((subscription.canceled_at + 3 * 24 * 60 * 60) * 1000);
  }

  // Extract timestamps from subscription
  const sub = subscription as unknown as Record<string, unknown>;
  const periodStart = (sub.current_period_start || sub.currentPeriodStart) as number | undefined;
  const periodEnd = (sub.current_period_end || sub.currentPeriodEnd) as number | undefined;

  await prisma.subscription.upsert({
    where: { guildId },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id,
      status: internalStatus,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      graceEndAt,
    },
    create: {
      guildId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id,
      status: internalStatus,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

/**
 * Handle subscription deletion (cancelled after period end)
 */
export async function handleSubscriptionDeleted(subscription: StripeSubscription): Promise<void> {
  const guildId = subscription.metadata.guildId;
  if (!guildId) return;

  // Set to GRACE_PERIOD initially, cron job will transition to FREE after 3 days
  const graceEndAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  await prisma.subscription.update({
    where: { guildId },
    data: {
      status: 'GRACE_PERIOD',
      canceledAt: new Date(),
      graceEndAt,
    },
  });
}

// ═══════════════════════════════════════════════
// Checkout Session
// ═══════════════════════════════════════════════

export interface CreateCheckoutOptions {
  guildId: string;
  priceId: string;
  customerId?: string;
  userEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession(
  options: CreateCheckoutOptions
): Promise<{ url: string | null } | null> {
  const stripe = await getStripe();
  if (!stripe) return null;

  const { guildId, priceId, customerId, userEmail, successUrl, cancelUrl } = options;

  // Get or create customer
  let customer = customerId;
  if (!customer && userEmail) {
    // Check if customer exists
    const existing = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (existing.data.length > 0) {
      customer = existing.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: userEmail,
        metadata: { guildId },
      });
      customer = newCustomer.id;
    }
  }

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { guildId },
    },
    metadata: { guildId },
    allow_promotion_codes: true,
  });
}

// ═══════════════════════════════════════════════
// Customer Portal
// ═══════════════════════════════════════════════

/**
 * Create a Stripe billing portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string } | null> {
  const stripe = await getStripe();
  if (!stripe) return null;

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// ═══════════════════════════════════════════════
// Webhook Signature Verification
// ═══════════════════════════════════════════════

/**
 * Verify and construct Stripe webhook event
 */
export async function constructWebhookEvent(
  payload: string,
  signature: string
): Promise<unknown | null> {
  const stripe = await getStripe();
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !STRIPE_WEBHOOK_SECRET) return null;

  try {
    return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('[Stripe] Webhook signature verification failed:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════
// Retrieve Subscription
// ═══════════════════════════════════════════════

/**
 * Get subscription details from Stripe
 */
export async function getStripeSubscription(
  subscriptionId: string
): Promise<unknown | null> {
  const stripe = await getStripe();
  if (!stripe) return null;

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}
