/**
 * Schema Manager for Multi-Tenant Database Isolation
 * 
 * Manages PostgreSQL schemas for tenant isolation.
 * Each tenant gets their own schema with identical table structure.
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import { quoteIdentifier, getTenantSchemaName } from './utils/safe-identifier-quote';

export class SchemaManager {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create a new schema for a tenant
   */
  async createTenantSchema(tenantId: string): Promise<void> {
    const schemaName = this.getSchemaName(tenantId);

    // Validate schema name to prevent SQL injection
    if (!this.isValidSchemaName(schemaName)) {
      throw new Error(`Invalid schema name: ${schemaName}`);
    }

    // Create schema with safely quoted identifier
    const quotedSchema = quoteIdentifier(schemaName);
    await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`);

    // Run migrations for the new schema
    await this.migrateSchema(tenantId);
  }

  /**
   * Drop a tenant's schema (use with caution!)
   * Requires explicit confirmation phrase to prevent accidental deletion
   */
  async dropTenantSchema(tenantId: string, confirmPhrase?: string): Promise<void> {
    // Require explicit confirmation to prevent accidental deletion
    if (confirmPhrase !== `DELETE_TENANT_${tenantId}`) {
      throw new Error('Schema deletion requires confirmation phrase: DELETE_TENANT_' + tenantId);
    }

    const schemaName = this.getSchemaName(tenantId);

    if (!this.isValidSchemaName(schemaName)) {
      throw new Error(`Invalid schema name: ${schemaName}`);
    }

    // CASCADE will drop all objects in the schema
    const quotedSchema = quoteIdentifier(schemaName);
    await this.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`);
  }

  /**
   * Run Prisma migrations for a tenant schema
   */
  async migrateSchema(tenantId: string): Promise<void> {
    const schemaName = this.getSchemaName(tenantId);
    const baseUrl = process.env.DATABASE_URL;

    if (!baseUrl) {
      throw new Error('DATABASE_URL not set');
    }

    // Append schema to database URL
    const tenantUrl = this.appendSchemaToUrl(baseUrl, schemaName);

    // Run prisma migrate deploy with tenant URL
    const prismaPath = path.resolve(__dirname, '../prisma');

    try {
      execSync(`npx prisma db push --skip-generate`, {
        env: { ...process.env, DATABASE_URL: tenantUrl },
        cwd: prismaPath,
        stdio: 'pipe',
      });
    } catch (error: any) {
      throw new Error(`Failed to migrate schema ${schemaName}: ${error.message}`);
    }
  }

  /**
   * Check if a tenant schema exists
   */
  async schemaExists(tenantId: string): Promise<boolean> {
    const schemaName = this.getSchemaName(tenantId);

    const result = await this.prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = ${schemaName}
      ) as exists
    `;

    return result[0]?.exists ?? false;
  }

  /**
   * List all tenant schemas
   */
  async listTenantSchemas(): Promise<string[]> {
    const result = await this.prisma.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name LIKE 'tenant_%'
      ORDER BY schema_name
    `;

    return result.map(r => r.schema_name);
  }

  /**
   * Get schema name from tenant ID
   * Uses centralized validation and sanitization
   */
  getSchemaName(tenantId: string): string {
    return getTenantSchemaName(tenantId);
  }

  /**
   * Validate schema name for safety
   */
  private isValidSchemaName(name: string): boolean {
    // Only allow alphanumeric, underscores, and must start with tenant_
    return /^tenant_[a-zA-Z0-9_]+$/.test(name) && name.length <= 63;
  }

  /**
   * Append schema parameter to PostgreSQL URL
   */
  private appendSchemaToUrl(baseUrl: string, schema: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schema);
    return url.toString();
  }

  /**
   * Get tenant ID from schema name
   */
  getTenantIdFromSchema(schemaName: string): string | null {
    const match = schemaName.match(/^tenant_(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Cleanup - close Prisma connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Singleton instance
let schemaManager: SchemaManager | null = null;

export function getSchemaManager(): SchemaManager {
  if (!schemaManager) {
    schemaManager = new SchemaManager();
  }
  return schemaManager;
}

// Helper to get max guilds by tier
export function getMaxGuildsByTier(tier: 'FREE' | 'PRO' | 'ULTRA'): number {
  const limits = {
    FREE: 1,
    PRO: 2,
    ULTRA: 3,
  };
  return limits[tier] ?? 1;
}
