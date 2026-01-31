/**
 * Audit Logging Utilities
 * Standardized audit log recording with full context
 */

import { prisma, AuditAction, AuditCategory, AuditSource } from '@repo/database';
import { v4 as uuid } from 'uuid';

// Sensitive fields to redact from audit logs
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
  'stripeCustomerId',
  'stripeSubscriptionId',
];

/**
 * Redact sensitive fields from an object
 */
function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(redactSensitive);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export interface AuditLogInput {
  guildId: string;
  userId: string;
  requestId: string;
  source: AuditSource;
  ipAddress?: string;
  userAgent?: string;
  action: AuditAction;
  category: AuditCategory;
  target?: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Record an audit log entry
 */
export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLogEntry.create({
      data: {
        guildId: input.guildId,
        userId: input.userId,
        requestId: input.requestId,
        source: input.source,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        action: input.action,
        category: input.category,
        target: input.target,
        before: input.before ? redactSensitive(input.before) as any : undefined,
        after: input.after ? redactSensitive(input.after) as any : undefined,
      },
    });
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to record audit log:', error);
  }
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return uuid();
}
