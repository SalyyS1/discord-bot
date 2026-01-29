/**
 * Stop Bot API Route
 * POST - Stop a tenant's bot
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { ApiResponse, getCurrentUserId } from '@/lib/session';
import { canOperateBot, AuditAction, getRateLimitHeaders } from '@repo/security';
import { logger } from '@/lib/logger';
import { managerApi } from '@/lib/manager-api-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  if (!userId) {
    return ApiResponse.unauthorized();
  }

  try {
    // Rate limit bot operations
    const rateLimit = await canOperateBot(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many bot operations. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const tenant = await prisma.tenant.findFirst({
      where: { id, userId },
    });

    if (!tenant) {
      return ApiResponse.notFound('Tenant not found');
    }

    if (!tenant.isRunning) {
      return ApiResponse.error('Bot is not running', 400);
    }

    try {
      // Call Manager API to stop bot
      await managerApi.stopBot(id);

      // Update database status
      await prisma.tenant.update({
        where: { id },
        data: {
          status: 'SUSPENDED',
          isRunning: false,
          processId: null,
          lastStoppedAt: new Date(),
        },
      });

      // Log audit
      await prisma.tenantAuditLog.create({
        data: {
          tenantId: id,
          userId,
          action: AuditAction.TENANT_STOPPED,
        },
      });

      return ApiResponse.success({ stopped: true });
    } catch (managerError) {
      const errorMsg = managerError instanceof Error ? managerError.message : 'Failed to communicate with bot manager';
      logger.error(`Manager API error: ${errorMsg}`);
      return ApiResponse.error(`Failed to stop bot: ${errorMsg}`, 500);
    }
  } catch (error) {
    logger.error(`Failed to stop tenant: ${error}`);
    return ApiResponse.serverError();
  }
}

