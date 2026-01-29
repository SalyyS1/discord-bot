/**
 * Re-export database utilities
 * This file exists for backward compatibility with imports using @/lib/db
 * 
 * Note: We selectively export to avoid conflicts between transaction-helpers
 * and safe-transaction-helpers which have overlapping function names.
 */

// From safe-transaction-helpers (race-safe operations)
export {
    getNextTicketNumber,
    createTicketWithNumber,
    addMemberXP,
    createGiveawayEntry,
    updateGuildSettingsSafe,
} from './db/safe-transaction-helpers';

// From transaction-helpers (retry logic and optimistic locking)
export {
    retryTransaction,
    incrementMemberXp,
    updateWithOptimisticLock,
    batchUpdate,
    safeUpsert,
    type RetryOptions,
    type OptimisticLockError,
} from './db/transaction-helpers';

// Re-export prisma client
export { prisma } from '@repo/database';
