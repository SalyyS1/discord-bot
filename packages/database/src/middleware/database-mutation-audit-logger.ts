/**
 * Database Mutation Audit Logger
 *
 * NOTE: Prisma v5+ deprecated $use middleware in favor of $extends.
 * This provides utility functions for manual audit logging.
 *
 * For now, call logAuditEntry() manually after mutations in API routes.
 *
 * TODO: Migrate to Prisma Client Extensions API
 * See: https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions
 */

import { PrismaClient } from '@prisma/client';

// Fields to redact in audit logs
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'discordToken',
  'discordClientSecret',
  'accessToken',
  'refreshToken',
  'idToken',
];

export interface AuditContext {
  guildId?: string;
  userId: string;
  requestId: string;
  source: 'DASHBOARD' | 'API' | 'BOT' | 'WEBHOOK' | 'SYSTEM';
  ipAddress?: string;
}

export interface AuditEntryData {
  action: string;
  category: string;
  target?: string;
  before?: any;
  after?: any;
}

function redactSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const redacted = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  }

  // Recursively redact nested objects
  for (const key in redacted) {
    if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }

  return redacted;
}

/**
 * Manually log an audit entry
 *
 * @param prisma - Prisma client instance
 * @param context - Audit context (user, request, source)
 * @param data - Audit entry data
 */
export async function logAuditEntry(
  prisma: PrismaClient,
  context: AuditContext,
  data: AuditEntryData
): Promise<void> {
  try {
    await prisma.auditLogEntry.create({
      data: {
        guildId: context.guildId || '',
        userId: context.userId,
        requestId: context.requestId,
        source: context.source,
        ipAddress: context.ipAddress,
        action: data.action as any,
        category: data.category as any,
        target: data.target,
        before: data.before ? redactSensitiveData(data.before) : null,
        after: data.after ? redactSensitiveData(data.after) : null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

