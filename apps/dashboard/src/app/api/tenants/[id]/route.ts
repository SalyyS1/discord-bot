/**
 * Single Tenant API Routes
 * GET - Get tenant details
 * PATCH - Update tenant
 * DELETE - Delete tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { ApiResponse, getCurrentUserId } from '@/lib/session';
import {
  getEncryptionService,
  validateDiscordToken,
  canUpdateCredentials,
  AuditAction,
  getRateLimitHeaders,
} from '@repo/security';
import { logger } from '@/lib/logger';

const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  discordToken: z.string().min(50).optional(),
  discordClientId: z.string().regex(/^\d{17,19}$/).optional(),
  discordClientSecret: z.string().optional(),
});

// Helper to verify tenant ownership
async function verifyTenantOwnership(tenantId: string, userId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, userId },
  });
  return tenant;
}

// GET - Get tenant details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  if (!userId) {
    return ApiResponse.unauthorized();
  }

  try {
    const tenant = await prisma.tenant.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        status: true,
        tier: true,
        discordClientId: true,
        botUsername: true,
        botAvatar: true,
        isRunning: true,
        processId: true,
        currentGuilds: true,
        lastStartedAt: true,
        lastStoppedAt: true,
        lastError: true,
        errorCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      return ApiResponse.notFound('Tenant not found');
    }

    return ApiResponse.success(tenant);
  } catch (error) {
    logger.error(`Failed to fetch tenant: ${error}`);
    return ApiResponse.serverError();
  }
}

// PATCH - Update tenant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  if (!userId) {
    return ApiResponse.unauthorized();
  }

  try {
    const tenant = await verifyTenantOwnership(id, userId);
    if (!tenant) {
      return ApiResponse.notFound('Tenant not found');
    }

    // Can't update while running
    if (tenant.isRunning) {
      return ApiResponse.error('Stop the bot before updating credentials', 400);
    }

    const body = await request.json();
    const validated = updateTenantSchema.parse(body);

    // Rate limit credential updates
    if (validated.discordToken) {
      const rateLimit = await canUpdateCredentials(userId);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { success: false, error: 'Too many credential updates. Try again later.' },
          { status: 429, headers: getRateLimitHeaders(rateLimit) }
        );
      }
    }

    // Prepare update data
    const updateData: Record<string, any> = { ...validated };
    let botUsername: string | undefined;
    let botAvatar: string | undefined;

    // If token is being updated, validate and encrypt
    if (validated.discordToken) {
      const tokenValidation = await validateDiscordToken(validated.discordToken);
      if (!tokenValidation.valid) {
        return ApiResponse.error(
          tokenValidation.error || 'Invalid Discord bot token',
          400
        );
      }

      const encryption = getEncryptionService();
      updateData.discordToken = encryption.encrypt(validated.discordToken);
      updateData.status = 'SUSPENDED';
      updateData.botUsername = tokenValidation.botUsername;
      updateData.botAvatar = tokenValidation.botAvatar;
      botUsername = tokenValidation.botUsername;
      botAvatar = tokenValidation.botAvatar;

      // Log token rotation
      await prisma.tenantAuditLog.create({
        data: {
          tenantId: id,
          userId,
          action: AuditAction.TOKEN_ROTATED,
          metadata: { newBotUsername: tokenValidation.botUsername },
        },
      });
    }

    // Encrypt client secret if provided
    if (validated.discordClientSecret) {
      const encryption = getEncryptionService();
      updateData.discordClientSecret = encryption.encrypt(validated.discordClientSecret);
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        status: true,
        botUsername: true,
        botAvatar: true,
        updatedAt: true,
      },
    });

    // Log audit
    await prisma.tenantAuditLog.create({
      data: {
        tenantId: id,
        userId,
        action: AuditAction.TENANT_UPDATED,
        metadata: {
          fields: Object.keys(validated).filter(k => k !== 'discordToken' && k !== 'discordClientSecret'),
          tokenChanged: !!validated.discordToken,
        },
      },
    });

    return ApiResponse.success(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.error(error.errors[0].message, 400);
    }
    logger.error(`Failed to update tenant: ${error}`);
    return ApiResponse.serverError();
  }
}

// DELETE - Delete tenant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  if (!userId) {
    return ApiResponse.unauthorized();
  }

  try {
    const tenant = await verifyTenantOwnership(id, userId);
    if (!tenant) {
      return ApiResponse.notFound('Tenant not found');
    }

    // Can't delete while running
    if (tenant.isRunning) {
      return ApiResponse.error('Stop the bot before deleting', 400);
    }

    // Log before deletion (since cascade will delete audit logs too)
    // In production, you might want to archive these logs first
    logger.info(`Tenant ${id} deleted by user ${userId}`);

    // Delete tenant (cascades to audit logs)
    await prisma.tenant.delete({
      where: { id },
    });

    return ApiResponse.success({ deleted: true });
  } catch (error) {
    logger.error(`Failed to delete tenant: ${error}`);
    return ApiResponse.serverError();
  }
}
