/**
 * Tenant-Specific Prisma Client Factory
 * 
 * Creates isolated Prisma clients for each tenant with their own schema.
 * Used by bot instances running in multi-tenant mode.
 */

import { PrismaClient } from '@prisma/client';

// Cache for tenant Prisma clients
const tenantClients = new Map<string, PrismaClient>();

/**
 * Get schema name from tenant ID
 */
function getSchemaName(tenantId: string): string {
  const sanitized = tenantId.replace(/[^a-zA-Z0-9_]/g, '');
  return `tenant_${sanitized}`;
}

/**
 * Append schema parameter to PostgreSQL URL
 */
function appendSchemaToUrl(baseUrl: string, schema: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('schema', schema);
  return url.toString();
}

/**
 * Create a Prisma client for a specific tenant
 * 
 * @param tenantId - The tenant's unique identifier
 * @param cache - Whether to cache the client (default: true)
 * @returns PrismaClient configured for the tenant's schema
 */
export function createTenantPrisma(tenantId: string, cache = true): PrismaClient {
  // Check cache first
  if (cache && tenantClients.has(tenantId)) {
    return tenantClients.get(tenantId)!;
  }

  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const schemaName = getSchemaName(tenantId);
  const tenantUrl = appendSchemaToUrl(baseUrl, schemaName);

  const client = new PrismaClient({
    datasources: {
      db: {
        url: tenantUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

  // Cache the client
  if (cache) {
    tenantClients.set(tenantId, client);
  }

  return client;
}

/**
 * Get an existing tenant Prisma client from cache
 * 
 * @param tenantId - The tenant's unique identifier
 * @returns PrismaClient or undefined if not cached
 */
export function getTenantPrisma(tenantId: string): PrismaClient | undefined {
  return tenantClients.get(tenantId);
}

/**
 * Disconnect and remove a tenant's Prisma client from cache
 * 
 * @param tenantId - The tenant's unique identifier
 */
export async function disconnectTenantPrisma(tenantId: string): Promise<void> {
  const client = tenantClients.get(tenantId);
  if (client) {
    await client.$disconnect();
    tenantClients.delete(tenantId);
  }
}

/**
 * Disconnect all cached tenant Prisma clients
 */
export async function disconnectAllTenantPrisma(): Promise<void> {
  const disconnectPromises = Array.from(tenantClients.values()).map(
    client => client.$disconnect()
  );
  await Promise.all(disconnectPromises);
  tenantClients.clear();
}

/**
 * Get count of cached tenant clients
 */
export function getCachedTenantCount(): number {
  return tenantClients.size;
}

/**
 * Check if a tenant client is cached
 */
export function isTenantClientCached(tenantId: string): boolean {
  return tenantClients.has(tenantId);
}
