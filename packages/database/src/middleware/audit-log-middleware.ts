/**
 * Audit Log Middleware
 *
 * Logs all mutation operations (create, update, delete) for compliance and debugging.
 * Captures model, action, timestamp, and affected record IDs.
 *
 * Note: Prisma 6.x removed MiddlewareParams. Using inline type definition.
 */

/**
 * Middleware params type for Prisma middleware
 */
interface MiddlewareParams {
  model?: string;
  action: string;
  args: Record<string, unknown>;
  dataPath: string[];
  runInTransaction: boolean;
}

export interface AuditLogEntry {
  timestamp: Date;
  model: string;
  action: string;
  recordId?: string | number;
  guildId?: string;
  userId?: string;
  data?: any;
  error?: string;
}

export type AuditLogHandler = (entry: AuditLogEntry) => void | Promise<void>;

/**
 * Default audit log handler - logs to console
 */
const defaultHandler: AuditLogHandler = (entry) => {
  console.log('[AuditLog]', JSON.stringify(entry, null, 2));
};

/**
 * Extract record ID from result or args
 */
function extractRecordId(result: any, args: any): string | number | undefined {
  if (result?.id) return result.id;
  if (args.where?.id) return args.where.id;
  if (args.data?.id) return args.data.id;
  return undefined;
}

/**
 * Extract guildId from result or args
 */
function extractGuildId(result: any, args: any): string | undefined {
  if (result?.guildId) return result.guildId;
  if (args.where?.guildId) return args.where.guildId;
  if (args.data?.guildId) return args.data.guildId;
  return undefined;
}

/**
 * Extract userId from result or args
 */
function extractUserId(result: any, args: any): string | undefined {
  if (result?.userId) return result.userId;
  if (args.where?.userId) return args.where.userId;
  if (args.data?.userId) return args.data.userId;
  if (result?.discordId) return result.discordId;
  if (args.where?.discordId) return args.where.discordId;
  if (args.data?.discordId) return args.data.discordId;
  return undefined;
}

/**
 * Sanitize data to remove sensitive fields
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'privateKey'];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Create audit log middleware
 *
 * @param handler - Custom handler for audit log entries (optional)
 * @param options - Configuration options
 *
 * Usage:
 * ```typescript
 * prisma.$use(createAuditLogMiddleware({
 *   handler: async (entry) => {
 *     await saveToDatabase(entry);
 *   },
 *   excludeModels: ['Session'],
 *   includeData: true
 * }));
 * ```
 */
export function createAuditLogMiddleware(options?: {
  handler?: AuditLogHandler;
  excludeModels?: string[];
  includeActions?: string[];
  excludeActions?: string[];
  includeData?: boolean;
  sanitize?: boolean;
}) {
  const {
    handler = defaultHandler,
    excludeModels = [],
    includeActions = ['create', 'update', 'delete', 'createMany', 'updateMany', 'deleteMany', 'upsert'],
    excludeActions = [],
    includeData = false,
    sanitize = true,
  } = options || {};

  return async (params: MiddlewareParams, next: (params: MiddlewareParams) => Promise<unknown>) => {
    const { model, action, args } = params;

    // Skip if no model or excluded
    if (!model || excludeModels.includes(model)) {
      return next(params);
    }

    // Skip if action not included or excluded
    if (!includeActions.includes(action) || excludeActions.includes(action)) {
      return next(params);
    }

    const startTime = Date.now();
    let result: any;
    let error: Error | undefined;

    try {
      result = await next(params);
      return result;
    } catch (err) {
      error = err as Error;
      throw err;
    } finally {
      // Create audit log entry
      const entry: AuditLogEntry = {
        timestamp: new Date(),
        model,
        action,
        recordId: result ? extractRecordId(result, args) : undefined,
        guildId: extractGuildId(result, args),
        userId: extractUserId(result, args),
      };

      // Include data if requested
      if (includeData && args.data) {
        entry.data = sanitize ? sanitizeData(args.data) : args.data;
      }

      // Include error if present
      if (error) {
        entry.error = error.message;
      }

      // Call handler (async safe)
      try {
        await Promise.resolve(handler(entry));
      } catch (handlerError) {
        console.error('[AuditLog] Handler error:', handlerError);
      }
    }
  };
}

/**
 * Database audit log handler - saves to AuditLog table
 *
 * Usage:
 * ```typescript
 * import { PrismaClient } from '@prisma/client';
 *
 * const prisma = new PrismaClient();
 *
 * prisma.$use(createAuditLogMiddleware({
 *   handler: createDatabaseAuditHandler(prisma)
 * }));
 * ```
 */
export function createDatabaseAuditHandler(prisma: any): AuditLogHandler {
  return async (entry) => {
    try {
      // Avoid infinite loop - don't log AuditLog operations
      if (entry.model === 'AuditLog') return;

      await prisma.auditLog.create({
        data: {
          model: entry.model,
          action: entry.action,
          recordId: entry.recordId?.toString(),
          guildId: entry.guildId,
          userId: entry.userId,
          data: entry.data ? JSON.stringify(entry.data) : undefined,
          error: entry.error,
          timestamp: entry.timestamp,
        },
      });
    } catch (error) {
      console.error('[AuditLog] Failed to save audit log:', error);
    }
  };
}

/**
 * File-based audit log handler - appends to file
 */
export function createFileAuditHandler(filePath: string): AuditLogHandler {
  return async (entry) => {
    const fs = await import('fs/promises');
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(filePath, line, 'utf-8');
  };
}
