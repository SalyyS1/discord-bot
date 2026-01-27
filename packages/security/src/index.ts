/**
 * @repo/security - Security utilities for multi-tenant bot platform
 * 
 * Features:
 * - AES-256-GCM encryption for sensitive credentials
 * - Discord token validation
 * - Audit logging
 * - Rate limiting
 */

// Encryption
export {
  EncryptionService,
  getEncryptionService,
  clearEncryptionService,
  generateEncryptionKey,
} from './encryption.ts';

// Token validation
export {
  validateDiscordToken,
  validateClientId,
  validateTokenFormat,
  extractBotIdFromToken,
  type TokenValidationResult,
} from './validator.ts';

// Audit logging
export {
  AuditAction,
  logAudit,
  getAuditLogs,
  getUserAuditLogs,
  createAuditHelper,
  type AuditEntry,
} from './audit.ts';

// Rate limiting
export {
  checkRateLimit,
  resetRateLimit,
  canCreateTenant,
  canOperateBot,
  canUpdateCredentials,
  canAccessApi,
  getRateLimitHeaders,
  type RateLimitResult,
} from './ratelimit.ts';
