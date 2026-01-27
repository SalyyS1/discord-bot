/**
 * Tenant Audit Logging Service
 * Tracks all security-relevant actions for compliance and debugging
 */

import { prisma } from '@repo/database';

// Using const object instead of enum for Node.js strip-only compatibility
export const AuditAction = {
  // Tenant lifecycle
  TENANT_CREATED: 'TENANT_CREATED',
  TENANT_UPDATED: 'TENANT_UPDATED',
  TENANT_DELETED: 'TENANT_DELETED',

  // Bot operations
  TENANT_STARTED: 'TENANT_STARTED',
  TENANT_STOPPED: 'TENANT_STOPPED',
  TENANT_RESTARTED: 'TENANT_RESTARTED',
  TENANT_CRASHED: 'TENANT_CRASHED',

  // Security events
  TOKEN_ROTATED: 'TOKEN_ROTATED',
  TOKEN_VALIDATED: 'TOKEN_VALIDATED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  CREDENTIALS_ACCESSED: 'CREDENTIALS_ACCESSED',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // Admin actions
  TIER_UPGRADED: 'TIER_UPGRADED',
  TIER_DOWNGRADED: 'TIER_DOWNGRADED',
  ADMIN_FORCE_STOP: 'ADMIN_FORCE_STOP',
} as const;

export type AuditAction = typeof AuditAction[keyof typeof AuditAction];

export interface AuditEntry {
  action: AuditAction | string;
  tenantId: string;
  userId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Log an audit entry to the database
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.tenantAuditLog.create({
      data: {
        action: entry.action,
        tenantId: entry.tenantId,
        userId: entry.userId,
        metadata: entry.metadata || {},
        ipAddress: entry.ipAddress,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    // Log to console but don't fail the main operation
    console.error('[Audit] Failed to log audit entry:', error);
  }
}

/**
 * Get recent audit logs for a tenant
 */
export async function getAuditLogs(
  tenantId: string,
  options: { limit?: number; offset?: number; actions?: AuditAction[] } = {}
): Promise<any[]> {
  const { limit = 50, offset = 0, actions } = options;

  return prisma.tenantAuditLog.findMany({
    where: {
      tenantId,
      ...(actions && actions.length > 0 && { action: { in: actions } }),
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get audit logs for a user across all their tenants
 */
export async function getUserAuditLogs(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<any[]> {
  const { limit = 50, offset = 0 } = options;

  return prisma.tenantAuditLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: offset,
    include: {
      tenant: {
        select: { name: true },
      },
    },
  });
}

/**
 * Create a helper to build audit entry with request context
 */
export function createAuditHelper(userId: string, ipAddress?: string) {
  return {
    log: (action: AuditAction | string, tenantId: string, metadata?: Record<string, any>) =>
      logAudit({
        action,
        tenantId,
        userId,
        metadata,
        ipAddress,
      }),
  };
}
