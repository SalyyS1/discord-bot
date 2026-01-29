/**
 * Re-export database utilities
 * This file exists for backward compatibility with imports using @/lib/db
 */
export * from './db/safe-transaction-helpers';
export * from './db/transaction-helpers';
export { prisma } from '@repo/database';
