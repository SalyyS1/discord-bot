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
} from './encryption';

// Encryption migration
export { migrateEncryptedTokens } from './encryption-key-rotation-migration';

// Token validation
export {
  validateDiscordToken,
  validateClientId,
  validateTokenFormat,
  extractBotIdFromToken,
  type TokenValidationResult,
} from './validator';

// Audit logging
export {
  AuditAction,
  logAudit,
  getAuditLogs,
  getUserAuditLogs,
  createAuditHelper,
  type AuditEntry,
} from './audit';

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
  type RateLimitOptions,
} from './ratelimit';

// Rate limiting internals
export { MemoryRateLimitStore, memoryStore } from './rate-limit-memory-fallback-store';
export { CircuitBreaker, redisCircuitBreaker } from './circuit-breaker-for-redis';

// Prometheus metrics
export {
  getMetrics,
  getMetricsContentType,
  securityMetricsRegistry,
} from './prometheus-metrics-registry';
