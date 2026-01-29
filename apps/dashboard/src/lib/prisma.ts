/**
 * Re-export Prisma client from @repo/database
 * This file exists for backward compatibility with imports using @/lib/prisma
 */
export { prisma } from '@repo/database';
export type { PrismaClient } from '@repo/database';
