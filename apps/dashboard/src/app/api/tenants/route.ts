/**
 * Tenant API Routes
 * GET - List user's tenants
 * POST - Create new tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { ApiResponse, getCurrentUserId } from '@/lib/session';
import {
  getEncryptionService,
  validateDiscordToken,
  canCreateTenant,
  AuditAction,
  getRateLimitHeaders
} from '@repo/security';
import { logger } from '@/lib/logger';

const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  discordToken: z.string().min(50), // Discord tokens are long
  discordClientId: z.string().regex(/^\d{17,19}$/),
  discordClientSecret: z.string().optional(),
});

// GET - List user's tenants
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return ApiResponse.unauthorized();
  }

  try {
    const tenants = await prisma.tenant.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        status: true,
        tier: true,
        botUsername: true,
        botAvatar: true,
        isRunning: true,
        currentGuilds: true,
        lastStartedAt: true,
        lastStoppedAt: true,
        lastError: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(tenants);
  } catch (error) {
    logger.error(`Failed to fetch tenants: ${error}`);
    return ApiResponse.serverError();
  }
}

// POST - Create new tenant
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return ApiResponse.unauthorized();
  }

  try {
    // Check rate limit
    const rateLimit = await canCreateTenant(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const validated = createTenantSchema.parse(body);

    // Check if user already has max tenants (1 for free tier)
    const existingCount = await prisma.tenant.count({
      where: { userId },
    });

    if (existingCount >= 1) {
      return ApiResponse.error('You have reached the maximum number of bots for your plan', 403);
    }

    // Validate the Discord token
    const tokenValidation = await validateDiscordToken(validated.discordToken);
    if (!tokenValidation.valid) {
      return ApiResponse.error(
        tokenValidation.error || 'Invalid Discord bot token',
        400
      );
    }

    // Encrypt sensitive credentials before storage
    const encryption = getEncryptionService();
    const encryptedToken = encryption.encrypt(validated.discordToken);
    const encryptedSecret = validated.discordClientSecret
      ? encryption.encrypt(validated.discordClientSecret)
      : undefined;

    const tenant = await prisma.tenant.create({
      data: {
        userId,
        name: validated.name,
        discordToken: encryptedToken,
        discordClientId: validated.discordClientId,
        discordClientSecret: encryptedSecret,
        botUsername: tokenValidation.botUsername,
        botAvatar: tokenValidation.botAvatar,
        status: 'SUSPENDED', // Ready to start
        tier: 'FREE',
      },
      select: {
        id: true,
        name: true,
        status: true,
        tier: true,
        botUsername: true,
        botAvatar: true,
        createdAt: true,
      },
    });

    // Log audit
    await prisma.tenantAuditLog.create({
      data: {
        tenantId: tenant.id,
        userId,
        action: AuditAction.TENANT_CREATED,
        metadata: {
          name: validated.name,
          botUsername: tokenValidation.botUsername,
        },
      },
    });

    return ApiResponse.success(tenant, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.error(error.errors[0].message, 400);
    }
    logger.error(`Failed to create tenant: ${error}`);
    return ApiResponse.serverError();
  }
}
