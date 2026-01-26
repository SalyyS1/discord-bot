/**
 * Prisma Client for Bot
 * 
 * Supports both single-tenant (default) and multi-tenant modes.
 * When TENANT_ID is set, uses tenant-specific schema.
 */

import { prisma as defaultPrisma, createTenantPrisma, PrismaClient } from '@repo/database';
import { logger } from '../utils/logger.js';

// Re-export types and utilities
export * from '@repo/database';

// Get tenant ID from environment (set by bot manager)
const TENANT_ID = process.env.TENANT_ID;

// Create appropriate Prisma client
let _prisma: PrismaClient;

if (TENANT_ID) {
  // Multi-tenant mode: use tenant-specific schema
  logger.info(`Prisma running in tenant mode: ${TENANT_ID}`);
  _prisma = createTenantPrisma(TENANT_ID);
} else {
  // Single-tenant mode: use default public schema
  _prisma = defaultPrisma;
}

export const prisma = _prisma;

// Helper to check if running in tenant mode
export function isTenantMode(): boolean {
  return !!TENANT_ID;
}

// Helper to get current tenant ID
export function getCurrentTenantId(): string | undefined {
  return TENANT_ID;
}
