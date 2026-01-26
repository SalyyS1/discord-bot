/**
 * Audit Logging Utility
 * Provides standardized audit logging with automatic sensitive data redaction
 */

// Generic Prisma client type to avoid direct dependency on @repo/database
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaLike = any;

// Mirror the Prisma enums for type safety
export type AuditSource = 'DASHBOARD' | 'API' | 'BOT' | 'WEBHOOK' | 'SYSTEM';
export type AuditCategory =
  | 'SETTINGS'
  | 'MODERATION'
  | 'TICKETS'
  | 'GIVEAWAYS'
  | 'BILLING'
  | 'MEMBERS';
export type AuditAction =
  | 'SETTINGS_VIEW'
  | 'SETTINGS_UPDATE'
  | 'SETTINGS_IMPORT'
  | 'SETTINGS_EXPORT'
  | 'MEMBER_BAN'
  | 'MEMBER_UNBAN'
  | 'MEMBER_KICK'
  | 'MEMBER_TIMEOUT'
  | 'MEMBER_WARN'
  | 'TICKET_CREATE'
  | 'TICKET_CLAIM'
  | 'TICKET_CLOSE'
  | 'TICKET_REOPEN'
  | 'SUBSCRIPTION_VIEW'
  | 'SUBSCRIPTION_UPGRADE'
  | 'SUBSCRIPTION_CANCEL'
  | 'SUBSCRIPTION_RESUME'
  | 'GIVEAWAY_CREATE'
  | 'GIVEAWAY_END'
  | 'GIVEAWAY_CANCEL';

export interface AuditLogParams {
  guildId: string;
  userId: string;
  requestId: string;
  source: AuditSource;
  action: AuditAction;
  category?: AuditCategory;
  target?: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

// Fields containing sensitive data that should be redacted
const REDACT_FIELDS = [
  'accesstoken',
  'refreshtoken',
  'stripecustomerid',
  'stripesubscriptionid',
  'password',
  'secret',
  'apikey',
  'token',
  'authorization',
  'cookie',
  'sessionid',
];

/**
 * Redact sensitive fields from an object recursively
 */
export function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSensitive);
  }

  if (typeof obj !== 'object') return obj;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();

    // Check if field should be redacted
    if (REDACT_FIELDS.some((f) => lowerKey.includes(f))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Infer category from action name
 */
function inferCategory(action: AuditAction): AuditCategory {
  if (action.startsWith('SETTINGS_')) return 'SETTINGS';
  if (action.startsWith('MEMBER_')) return 'MODERATION';
  if (action.startsWith('TICKET_')) return 'TICKETS';
  if (action.startsWith('SUBSCRIPTION_')) return 'BILLING';
  if (action.startsWith('GIVEAWAY_')) return 'GIVEAWAYS';
  return 'SETTINGS';
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}_${random}`;
}

/**
 * Create audit logger instance bound to a Prisma client
 */
export function createAuditLogger(prisma: PrismaLike) {
  return async function auditLog(params: AuditLogParams): Promise<void> {
    const {
      guildId,
      userId,
      requestId,
      source,
      action,
      target,
      before,
      after,
      ipAddress,
      userAgent,
    } = params;

    const category = params.category ?? inferCategory(action);

    try {
      await prisma.auditLogEntry.create({
        data: {
          guildId,
          userId,
          requestId,
          source,
          action,
          category,
          target,
          before: before ? (redactSensitive(before) as object) : undefined,
          after: after ? (redactSensitive(after) as object) : undefined,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      // Log error but don't throw - audit logging shouldn't break main flow
      console.error('[AuditLog] Failed to write audit log:', error);
    }
  };
}

/**
 * Extract client IP from request headers
 * Handles proxied requests (X-Forwarded-For, etc.)
 */
export function getClientIp(headers: Headers): string | undefined {
  // Check common proxy headers
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0]?.trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;

  // Cloudflare
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  return undefined;
}

/**
 * Truncate user agent to reasonable length
 */
export function sanitizeUserAgent(userAgent: string | null): string | undefined {
  if (!userAgent) return undefined;
  // Truncate to 500 chars max
  return userAgent.substring(0, 500);
}
