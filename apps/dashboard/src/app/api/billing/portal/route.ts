/**
 * Billing Portal API
 * POST /api/billing/portal - Create customer portal session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { getServerSession, ApiResponse } from '@/lib/session';
import { getRequestContext } from '@/lib/request-context';
import { getUserDiscordGuilds } from '@/lib/discord-oauth';
import { createPortalSession, STRIPE_ENABLED } from '@/lib/stripe';

// Required permission: MANAGE_GUILD
const REQUIRED_PERMISSION = BigInt(0x20);

const portalSchema = z.object({
  guildId: z.string().regex(/^\d{17,19}$/),
});

/**
 * POST - Create a Stripe billing portal session
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

  const result = portalSchema.safeParse(body);
  if (!result.success) {
    return ApiResponse.badRequest(result.error.errors.map((e) => e.message).join(', '));
  }

  const { guildId } = result.data;

  // 1. Validate user has MANAGE_GUILD permission
  const userGuilds = await getUserDiscordGuilds(session.user.id);
  const guild = userGuilds.find((g) => g.id === guildId);

  if (!guild) {
    return ApiResponse.forbidden('You are not a member of this guild');
  }

  const hasPermission = (BigInt(guild.permissions) & REQUIRED_PERMISSION) !== BigInt(0);
  if (!hasPermission) {
    return ApiResponse.forbidden('You need MANAGE_GUILD permission to manage billing');
  }

  // 2. Get subscription
  const subscription = await prisma.subscription.findUnique({
    where: { guildId },
  });

  if (!subscription?.stripeCustomerId) {
    return ApiResponse.badRequest('No billing history found for this guild');
  }

  // 3. Create portal session
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const portalSession = await createPortalSession(
    subscription.stripeCustomerId,
    `${baseUrl}/dashboard?guild=${guildId}`
  );

  if (!portalSession) {
    return ApiResponse.serverError('Failed to create portal session');
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        portalUrl: portalSession.url,
      },
    },
    { headers: { 'x-request-id': ctx.requestId } }
  );
}
