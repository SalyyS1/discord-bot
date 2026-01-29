import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { getServerSession } from '../session';
import { logger } from '../logger';

/**
 * Admin Discord IDs from environment variable
 * Format: ADMIN_USER_IDS=discordId1,discordId2,discordId3
 */
const ADMIN_DISCORD_IDS = process.env.ADMIN_USER_IDS?.split(',').filter(Boolean) || [];

/**
 * Check if a Discord account ID is admin
 */
export function isAdminDiscordId(discordId: string): boolean {
  return ADMIN_DISCORD_IDS.includes(discordId);
}

/**
 * Verify if current user is admin by checking their Discord account
 * @param userId Better Auth user ID
 * @returns true if user has admin privileges
 */
export async function verifyAdminAccess(userId: string): Promise<boolean> {
  try {
    const account = await prisma.account.findFirst({
      where: { userId, providerId: 'discord' },
      select: { accountId: true },
    });

    if (!account) {
      return false;
    }

    return isAdminDiscordId(account.accountId);
  } catch (error) {
    logger.error('[AdminGuard] Failed to verify admin access', { userId, error });
    return false;
  }
}

/**
 * API middleware: Verify admin access and return error response if not authorized
 * @returns null if authorized, NextResponse with error if not
 */
export async function requireAdminAccess(): Promise<NextResponse | null> {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await verifyAdminAccess(session.user.id);

  if (!isAdmin) {
    logger.warn('[AdminGuard] Unauthorized admin access attempt', {
      userId: session.user.id,
      email: session.user.email,
    });
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  return null; // Authorized
}

/**
 * Client hook: Check if current user is admin
 * Use this on client components to conditionally render admin UI
 */
export async function useIsAdmin(): Promise<boolean> {
  const session = await getServerSession();
  if (!session?.user?.id) return false;
  return verifyAdminAccess(session.user.id);
}

/**
 * Audit log admin action
 */
export async function auditAdminAction(params: {
  userId: string;
  action: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await prisma.tenantAuditLog.create({
      data: {
        tenantId: 'SYSTEM', // System-level admin action
        userId: params.userId,
        action: `ADMIN_${params.action}`,
        metadata: (params.metadata || {}) as any,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    logger.error('[AdminGuard] Failed to audit admin action', { params, error });
  }
}
