import { type PrismaClient, Prisma } from '@repo/database';

/**
 * Transaction Helpers
 *
 * Safe transaction wrappers with retry logic for deadlocks and optimistic locking.
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export interface OptimisticLockError extends Error {
  code: 'OPTIMISTIC_LOCK_ERROR';
  model: string;
  id: string;
  expectedVersion: number;
  actualVersion: number;
}

/**
 * Check if error is a deadlock error
 */
function isDeadlockError(error: any): boolean {
  // PostgreSQL deadlock error code
  if (error.code === '40P01' || error.code === '40001') return true;

  // Prisma error codes
  if (error.code === 'P2034') return true; // Transaction conflict

  // Check error message
  const message = error.message?.toLowerCase() || '';
  return message.includes('deadlock') || message.includes('transaction conflict');
}

/**
 * Check if error is an optimistic lock error
 */
function isOptimisticLockError(error: any): boolean {
  return error.code === 'OPTIMISTIC_LOCK_ERROR';
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute transaction with retry logic for deadlocks
 *
 * @param prisma - Prisma client instance
 * @param fn - Transaction function
 * @param options - Retry options
 *
 * Usage:
 * ```typescript
 * const result = await retryTransaction(prisma, async (tx) => {
 *   const user = await tx.member.findUnique({ where: { id: userId } });
 *   await tx.member.update({
 *     where: { id: userId },
 *     data: { xp: user.xp + 10 }
 *   });
 * });
 * ```
 */
export async function retryTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 100,
    backoffMultiplier = 2,
    onRetry,
  } = options || {};

  let lastError: Error;
  let delay = retryDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      });
    } catch (error) {
      lastError = error as Error;

      // Check if should retry
      const shouldRetry = isDeadlockError(error) || isOptimisticLockError(error);

      if (shouldRetry && attempt < maxRetries) {
        // Call retry callback
        if (onRetry) {
          onRetry(lastError, attempt + 1);
        } else {
          console.warn(`[Transaction] Retry ${attempt + 1}/${maxRetries} due to: ${lastError.message}`);
        }

        // Wait before retry with exponential backoff
        await sleep(delay);
        delay *= backoffMultiplier;
      } else {
        // Max retries reached or non-retryable error
        throw lastError;
      }
    }
  }

  throw lastError!;
}

/**
 * Get next ticket number with race condition protection
 *
 * @param prisma - Prisma client instance
 * @param guildId - Guild ID
 * @returns Next ticket number
 */
export async function getNextTicketNumber(
  prisma: PrismaClient,
  guildId: string
): Promise<number> {
  return retryTransaction(prisma, async (tx) => {
    // Get max ticket number for guild
    const maxTicket = await tx.ticket.findFirst({
      where: { guildId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    return (maxTicket?.number ?? 0) + 1;
  });
}

/**
 * Increment member XP safely
 *
 * @param prisma - Prisma client instance
 * @param memberId - Member ID
 * @param amount - XP amount to add
 * @returns Updated member
 */
export async function incrementMemberXp(
  prisma: PrismaClient,
  memberId: string,
  amount: number
) {
  return prisma.member.update({
    where: { id: memberId },
    data: { xp: { increment: amount } },
  });
}

/**
 * Create giveaway entry with duplicate protection
 *
 * @param prisma - Prisma client instance
 * @param data - Entry data
 * @returns Created entry or existing entry
 */
export async function createGiveawayEntry(
  prisma: PrismaClient,
  data: {
    giveawayId: string;
    memberId: string;
    guildId: string;
  }
) {
  return retryTransaction(prisma, async (tx) => {
    // Check if entry already exists
    const existing = await tx.giveawayEntry.findUnique({
      where: {
        giveawayId_memberId: {
          giveawayId: data.giveawayId,
          memberId: data.memberId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Create new entry
    return tx.giveawayEntry.create({ data });
  });
}

/**
 * Update with optimistic locking
 *
 * @param prisma - Prisma client instance
 * @param model - Model name
 * @param id - Record ID
 * @param expectedVersion - Expected version
 * @param data - Update data
 * @returns Updated record
 *
 * Usage:
 * ```typescript
 * const settings = await updateWithOptimisticLock(
 *   prisma,
 *   'guildSettings',
 *   guildId,
 *   currentVersion,
 *   { prefix: '!' }
 * );
 * ```
 */
export async function updateWithOptimisticLock<T>(
  prisma: any,
  model: string,
  id: string,
  expectedVersion: number,
  data: any
): Promise<T> {
  return retryTransaction(prisma, async (tx) => {
    // Get current record
    const current = await (tx as any)[model].findUnique({
      where: { id },
      select: { version: true },
    });

    if (!current) {
      throw new Error(`${model} not found: ${id}`);
    }

    // Check version
    if (current.version !== expectedVersion) {
      const error = new Error(
        `Optimistic lock failed: expected version ${expectedVersion}, got ${current.version}`
      ) as OptimisticLockError;
      error.code = 'OPTIMISTIC_LOCK_ERROR';
      error.model = model;
      error.id = id;
      error.expectedVersion = expectedVersion;
      error.actualVersion = current.version;
      throw error;
    }

    // Update with version increment
    return (tx as any)[model].update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  });
}

/**
 * Batch update with chunk processing
 *
 * @param prisma - Prisma client instance
 * @param model - Model name
 * @param records - Records to update
 * @param chunkSize - Chunk size
 *
 * Usage:
 * ```typescript
 * await batchUpdate(prisma, 'member', members, 100);
 * ```
 */
export async function batchUpdate<T extends { id: string }>(
  prisma: any,
  model: string,
  records: T[],
  chunkSize = 100
): Promise<void> {
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);

    await retryTransaction(prisma, async (tx) => {
      await Promise.all(
        chunk.map((record) =>
          (tx as any)[model].update({
            where: { id: record.id },
            data: record,
          })
        )
      );
    });
  }
}

/**
 * Safe upsert with retry
 */
export async function safeUpsert<T>(
  prisma: any,
  model: string,
  where: any,
  create: any,
  update: any
): Promise<T> {
  return retryTransaction(prisma, async (tx) => {
    return (tx as any)[model].upsert({
      where,
      create,
      update,
    });
  });
}
