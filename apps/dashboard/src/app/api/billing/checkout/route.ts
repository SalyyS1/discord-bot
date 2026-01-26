/**
 * Billing Checkout API
 * POST /api/billing/checkout - Create checkout session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { createAuditLogger } from '@repo/config';
import { getServerSession, ApiResponse } from '@/lib/session';
import { getRequestContext } from '@/lib/request-context';
import { getUserDiscordGuilds } from '@/lib/discord-oauth';
import { createCheckoutSession, STRIPE_ENABLED } from '@/lib/stripe';

const auditLog = createAuditLogger(prisma);

// Required permission: MANAGE_GUILD
const REQUIRED_PERMISSION = BigInt(0x20);

const checkoutSchema = z.object({
  guildId: z.string().regex(/^\d{17,19}$/),
  priceId: z.string().startsWith('price_'),
});

/**
 * POST - Create a Stripe checkout session
 */
export async function POST(request: NextRequest) {
  if (!STRIPE_ENABLED) {
    return ApiResponse.serverError('Billing is not configured');
  }

  const ctx = getRequestContext(request);

  // Get session
  const session = await getServerSession();
  if (!session) return ApiResponse.unauthorized();

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return ApiResponse.badRequest('Invalid JSON body');
  }

  const result = checkoutSchema.safeParse(body);
  if (!result.success) {
    return ApiResponse.badRequest(result.error.errors.map((e) => e.message).join(', '));
  }

  const { guildId, priceId } = result.data;

  // 1. Validate user has MANAGE_GUILD permission
  const userGuilds = await getUserDiscordGuilds(session.user.id);
  const guild = userGuilds.find((g) => g.id === guildId);

  if (!guild) {
    return ApiResponse.forbidden('You are not a member of this guild');
  }

  const hasPermission = (BigInt(guild.permissions) & REQUIRED_PERMISSION) !== BigInt(0);
  if (!hasPermission) {
    return ApiResponse.forbidden('You need MANAGE_GUILD permission to purchase premium');
  }

  // 2. Verify bot is in guild
  const botGuild = await prisma.guild.findUnique({
    where: { id: guildId },
  });

  if (!botGuild || botGuild.leftAt) {
    return ApiResponse.badRequest('Bot must be in the server to purchase premium');
  }

  // 3. Check if already subscribed
  const existingSubscription = await prisma.subscription.findUnique({
    where: { guildId },
  });

  if (existingSubscription?.status === 'ACTIVE') {
    return ApiResponse.badRequest('Guild already has an active subscription');
  }

  // 4. Get user email
  const userEmail = session.user.email;

  // 5. Create checkout session
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const checkoutSession = await createCheckoutSession({
    guildId,
    priceId,
    customerId: existingSubscription?.stripeCustomerId ?? undefined,
    userEmail: userEmail ?? undefined,
    successUrl: `${baseUrl}/dashboard?guild=${guildId}&checkout=success`,
    cancelUrl: `${baseUrl}/dashboard?guild=${guildId}&checkout=cancelled`,
  });

  if (!checkoutSession) {
    return ApiResponse.serverError('Failed to create checkout session');
  }

  // Audit log
  try {
    await auditLog({
      guildId,
      userId: session.user.id,
      requestId: ctx.requestId,
      source: 'DASHBOARD',
      action: 'SUBSCRIPTION_UPGRADE',
      category: 'BILLING',
      after: { checkoutSessionId: checkoutSession.id },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  } catch (error) {
    console.error('[Billing] Audit log failed:', error);
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id,
      },
    },
    { headers: { 'x-request-id': ctx.requestId } }
  );
}
