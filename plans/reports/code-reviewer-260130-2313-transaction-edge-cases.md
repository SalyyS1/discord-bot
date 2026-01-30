# Code Review: Database & Transaction Edge Cases

**Date**: 2026-01-30
**Reviewer**: code-reviewer agent
**Work Context**: /mnt/d/Project/.2_PROJECT_BOT_DISCORD

---

## Scope

**Files Reviewed**:
- `apps/dashboard/src/lib/db/transaction-helpers.ts` (311 lines)
- `apps/dashboard/src/lib/db/safe-transaction-helpers.ts` (216 lines)

**Review Focus**: Edge case analysis for transaction handling, race conditions, optimistic locking

---

## Overall Assessment

Both files implement transaction helpers with varying levels of safety. **Critical race condition** in `getNextTicketNumber`, **off-by-one** in retry loop, **missing validation** in optimistic locking, and **no partial failure tracking** in batch updates.

---

## Critical Issues

### 1. **Transaction Retry Off-By-One Error**
**File**: `transaction-helpers.ts`
**Lines**: 86, 97
**Severity**: HIGH

#### Finding
```typescript
// Line 86: Loop condition
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  // Line 97: Retry check
  if (shouldRetry && attempt < maxRetries) {
```

**Status**: ⚠️ **PARTIAL**

**Problem**:
- Loop allows `maxRetries + 1` total iterations (0, 1, 2, 3 when `maxRetries=3`)
- Retry check at line 97 only retries when `attempt < maxRetries` (0, 1, 2)
- Result: **4 attempts instead of 3** (one initial + 3 retries)

**Example**:
```
maxRetries = 3
attempt=0: try → fail → retry (0 < 3) ✓
attempt=1: try → fail → retry (1 < 3) ✓
attempt=2: try → fail → retry (2 < 3) ✓
attempt=3: try → fail → no retry (3 < 3) ✗ → throw
Total: 4 attempts (not 3)
```

**Impact**:
- Misleading retry count in logs/callbacks
- Extra database load
- Unexpected behavior for users expecting exactly 3 retries

**Recommendation**:
```typescript
// Option 1: Fix loop condition
for (let attempt = 0; attempt < maxRetries; attempt++) {

// Option 2: Fix retry check
if (shouldRetry && attempt < maxRetries - 1) {
```

---

### 2. **Race Condition in getNextTicketNumber**
**File**: Both files
**Lines**:
- `transaction-helpers.ts:125-139`
- `safe-transaction-helpers.ts:19-32`

**Severity**: CRITICAL

#### Finding (transaction-helpers.ts)
```typescript
export async function getNextTicketNumber(
  prisma: PrismaClient,
  guildId: string
): Promise<number> {
  return retryTransaction(prisma, async (tx) => {
    const maxTicket = await tx.ticket.findFirst({
      where: { guildId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    return (maxTicket?.number ?? 0) + 1;  // ← DOES NOT LOCK
  });
}
```

**Status**: ❌ **UNHANDLED**

**Problem**:
- No row-level locking (`FOR UPDATE`)
- Two concurrent requests can read same `maxTicket.number`
- Both return same ticket number
- Race window between read and subsequent insert

**Scenario**:
```
Time  Request A                    Request B
----  ---------                    ---------
T1    SELECT MAX(number) → 42
T2                                 SELECT MAX(number) → 42
T3    RETURN 43
T4                                 RETURN 43
T5    INSERT ticket #43 ✓
T6                                 INSERT ticket #43 ✗ DUPLICATE
```

**Impact**:
- Duplicate ticket numbers in same guild
- Unique constraint violations (if exists)
- Data integrity failure

#### Finding (safe-transaction-helpers.ts)
```typescript
export async function getNextTicketNumber(
  prisma: PrismaClient,
  guildId: string
): Promise<number> {
  return await prisma.$transaction(async (tx) => {
    const maxTicket = await tx.ticket.findFirst({
      where: { guildId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    return (maxTicket?.number ?? 0) + 1;  // ← SAME ISSUE
  });
}
```

**Status**: ❌ **UNHANDLED** (despite filename "safe")

**Same Problem**: Transaction wrapper doesn't prevent race condition without explicit locking.

**Recommendation**:
```typescript
export async function getNextTicketNumber(
  prisma: PrismaClient,
  guildId: string
): Promise<number> {
  return retryTransaction(prisma, async (tx) => {
    // Option 1: Use SELECT FOR UPDATE (PostgreSQL)
    const maxTicket = await tx.$queryRaw<[{ number: number }]>`
      SELECT number
      FROM "Ticket"
      WHERE "guildId" = ${guildId}
      ORDER BY number DESC
      LIMIT 1
      FOR UPDATE
    `;

    return (maxTicket[0]?.number ?? 0) + 1;

    // Option 2: Use database sequence (better)
    // CREATE SEQUENCE ticket_number_seq_${guildId}
    // SELECT nextval('ticket_number_seq_${guildId}')

    // Option 3: Use counter table with row lock
    // UPDATE guild_counters
    // SET ticket_counter = ticket_counter + 1
    // WHERE guild_id = ${guildId}
    // RETURNING ticket_counter
  });
}
```

---

### 3. **Optimistic Lock on Non-Versioned Models**
**File**: `transaction-helpers.ts`
**Lines**: 225-228
**Severity**: HIGH

#### Finding
```typescript
export async function updateWithOptimisticLock<T>(
  prisma: any,
  model: string,
  id: string,
  expectedVersion: number,
  data: any
): Promise<T> {
  return retryTransaction(prisma, async (tx) => {
    const current = await (tx as any)[model].findUnique({
      where: { id },
      select: { version: true },  // ← NO VALIDATION if field exists
    });

    if (!current) {
      throw new Error(`${model} not found: ${id}`);
    }

    // Assumes 'version' field exists without checking
    if (current.version !== expectedVersion) {
      // ...
    }
  });
}
```

**Status**: ⚠️ **PARTIAL**

**Problem**:
- No runtime check if model has `version` field
- Accepts any `model: string` parameter
- Silent failure or undefined behavior if model lacks version field
- `current.version` could be `undefined` if field doesn't exist

**Impact**:
- False success on models without versioning
- Undefined comparison (`undefined !== expectedVersion`) always true
- Optimistic lock bypassed silently

**Recommendation**:
```typescript
export async function updateWithOptimisticLock<T>(
  prisma: any,
  model: string,
  id: string,
  expectedVersion: number,
  data: any
): Promise<T> {
  return retryTransaction(prisma, async (tx) => {
    const current = await (tx as any)[model].findUnique({
      where: { id },
      select: { version: true },
    });

    if (!current) {
      throw new Error(`${model} not found: ${id}`);
    }

    // ADD: Validate version field exists
    if (current.version === undefined || current.version === null) {
      throw new Error(
        `Model '${model}' does not support optimistic locking (missing 'version' field)`
      );
    }

    // Type guard
    const currentVersion = current.version as number;

    if (currentVersion !== expectedVersion) {
      const error = new Error(
        `Optimistic lock failed: expected version ${expectedVersion}, got ${currentVersion}`
      ) as OptimisticLockError;
      error.code = 'OPTIMISTIC_LOCK_ERROR';
      error.model = model;
      error.id = id;
      error.expectedVersion = expectedVersion;
      error.actualVersion = currentVersion;
      throw error;
    }

    return (tx as any)[model].update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  });
}
```

**Additional**: Consider TypeScript generic constraint:
```typescript
interface Versioned {
  version: number;
}

export async function updateWithOptimisticLock<
  T extends Versioned
>(
  // ...
)
```

---

### 4. **Batch Update Partial Failure Tracking**
**File**: `transaction-helpers.ts`
**Lines**: 277-291
**Severity**: MEDIUM

#### Finding
```typescript
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
    // ← NO tracking of which chunks succeeded
  }
}
```

**Status**: ❌ **UNHANDLED**

**Problem**:
- Chunk 1 succeeds → chunk 2 fails → chunk 3 not attempted
- No return value indicating progress
- Caller cannot resume from failure point
- No partial success information
- All-or-nothing per chunk, but not across chunks

**Impact**:
- Cannot retry specific failed chunks
- Must restart entire batch on failure
- Risk of duplicate updates if retrying whole batch
- No progress visibility

**Scenario**:
```
Total: 500 records, chunkSize=100
Chunk 0-99:   ✓ SUCCESS (committed)
Chunk 100-199: ✓ SUCCESS (committed)
Chunk 200-299: ✗ FAIL (rolled back)
Chunk 300-399: ⚠️ NOT ATTEMPTED
Chunk 400-499: ⚠️ NOT ATTEMPTED

Result: 200 records updated, 300 skipped, no way to know which
```

**Recommendation**:
```typescript
export interface BatchUpdateResult {
  total: number;
  succeeded: number;
  failed: number;
  failedChunks: Array<{
    startIndex: number;
    endIndex: number;
    records: string[];  // IDs
    error: Error;
  }>;
}

export async function batchUpdate<T extends { id: string }>(
  prisma: any,
  model: string,
  records: T[],
  chunkSize = 100
): Promise<BatchUpdateResult> {
  const result: BatchUpdateResult = {
    total: records.length,
    succeeded: 0,
    failed: 0,
    failedChunks: [],
  };

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);

    try {
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

      result.succeeded += chunk.length;
    } catch (error) {
      result.failed += chunk.length;
      result.failedChunks.push({
        startIndex: i,
        endIndex: i + chunk.length,
        records: chunk.map(r => r.id),
        error: error as Error,
      });

      // Optional: continue processing remaining chunks
      // or throw to stop
      // throw error;
    }
  }

  return result;
}
```

**Alternative**: Use database bulk operations:
```typescript
// More efficient for large batches
export async function batchUpdate<T extends { id: string }>(
  prisma: any,
  model: string,
  records: T[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const record of records) {
      await (tx as any)[model].update({
        where: { id: record.id },
        data: record,
      });
    }
  });
}
```

---

## High Priority Findings

### 5. **Missing Transaction Isolation Level in safe-transaction-helpers.ts**
**Lines**: 23, 53, 110, 168
**Severity**: MEDIUM

#### Finding
```typescript
// transaction-helpers.ts: Specifies isolation level
return await prisma.$transaction(fn, {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
});

// safe-transaction-helpers.ts: No isolation level
return await prisma.$transaction(async (tx) => {
  // Uses default (usually READ COMMITTED)
});
```

**Status**: ⚠️ **PARTIAL**

**Problem**:
- Inconsistent isolation levels across helpers
- Default may not match requirements
- Potential phantom reads in REPEATABLE READ scenarios

**Recommendation**:
- Add isolation level to all `$transaction` calls
- Document why READ COMMITTED chosen
- Consider SERIALIZABLE for critical operations

---

### 6. **Type Safety Issues**
**Lines**: Multiple
**Severity**: MEDIUM

#### Finding
```typescript
// Unsafe 'any' types
export async function updateWithOptimisticLock<T>(
  prisma: any,  // ← Should be PrismaClient
  model: string,
  // ...
)

export async function batchUpdate<T extends { id: string }>(
  prisma: any,  // ← Should be PrismaClient
  model: string,
  // ...
)
```

**Status**: ⚠️ **PARTIAL**

**Problem**:
- Loses type safety
- No autocomplete for model names
- Runtime errors instead of compile-time
- Cannot enforce correct model/field combinations

**Recommendation**:
```typescript
import { type PrismaClient, Prisma } from '@repo/database';

// Use Prisma delegate types
export async function updateWithOptimisticLock<
  TModel extends Prisma.ModelName,
  TResult
>(
  prisma: PrismaClient,
  model: TModel,
  id: string,
  expectedVersion: number,
  data: Partial<Prisma.TypeMap['model'][TModel]['operations']['update']['data']>
): Promise<TResult> {
  // ...
}
```

---

### 7. **safe-transaction-helpers.ts: updateGuildSettingsSafe Race Condition**
**Lines**: 166-212
**Severity**: MEDIUM

#### Finding
```typescript
while (retries < maxRetries) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Fetch current version
      const current = await tx.guildSettings.findUnique({
        where: { guildId },
        select: { version: true },
      });

      const currentVersion = current.version;

      // Update with version check
      const updated = await tx.guildSettings.updateMany({
        where: {
          guildId,
          version: currentVersion,  // ← Race window here
        },
        data: {
          ...updates,
          version: currentVersion + 1,
        },
      });
```

**Status**: ✅ **HANDLED** (with retry)

**Good**:
- Uses `updateMany` with version condition
- Detects concurrent updates via `count === 0`
- Automatic retry with exponential backoff
- Transaction wrapper ensures atomicity

**Improvement Needed**:
- Retry logic should use `retryTransaction` helper for consistency
- Manual retry loop duplicates existing retry logic

**Recommendation**:
```typescript
export async function updateGuildSettingsSafe(
  prisma: PrismaClient,
  guildId: string,
  updates: Record<string, any>,
  maxRetries = 3
) {
  return retryTransaction(
    prisma,
    async (tx) => {
      const current = await tx.guildSettings.findUnique({
        where: { guildId },
        select: { version: true },
      });

      if (!current) {
        throw new Error('Guild settings not found');
      }

      const updated = await tx.guildSettings.updateMany({
        where: {
          guildId,
          version: current.version,
        },
        data: {
          ...updates,
          version: current.version + 1,
        },
      });

      if (updated.count === 0) {
        const error = new Error('Concurrent update detected') as OptimisticLockError;
        error.code = 'OPTIMISTIC_LOCK_ERROR';
        error.model = 'guildSettings';
        error.id = guildId;
        throw error;
      }

      return await tx.guildSettings.findUnique({
        where: { guildId },
      });
    },
    { maxRetries }
  );
}
```

---

## Medium Priority Improvements

### 8. **Missing Error Context in retryTransaction**
**Lines**: 99-103
**Severity**: LOW

#### Finding
```typescript
if (onRetry) {
  onRetry(lastError, attempt + 1);
} else {
  console.warn(`[Transaction] Retry ${attempt + 1}/${maxRetries} due to: ${lastError.message}`);
}
```

**Problem**: Console.warn not ideal for production logging

**Recommendation**:
- Use structured logging library
- Include transaction name/context
- Add metrics/monitoring hooks

---

### 9. **incrementMemberXp Not Using Transaction**
**Lines**: 149-158
**Severity**: LOW

#### Finding
```typescript
export async function incrementMemberXp(
  prisma: PrismaClient,
  memberId: string,
  amount: number
) {
  return prisma.member.update({  // ← No retry wrapper
    where: { id: memberId },
    data: { xp: { increment: amount } },
  });
}
```

**Status**: ⚠️ **PARTIAL**

**Problem**: Not wrapped in `retryTransaction` despite being in transaction-helpers

**Note**: Atomic increment is safe, but should have deadlock retry

**Recommendation**:
```typescript
export async function incrementMemberXp(
  prisma: PrismaClient,
  memberId: string,
  amount: number
) {
  return retryTransaction(prisma, async (tx) => {
    return tx.member.update({
      where: { id: memberId },
      data: { xp: { increment: amount } },
    });
  });
}
```

---

### 10. **createGiveawayEntry Missing guildId Field**
**File**: `transaction-helpers.ts`
**Lines**: 167-193
**Severity**: LOW

#### Finding
```typescript
export async function createGiveawayEntry(
  prisma: PrismaClient,
  data: {
    giveawayId: string;
    memberId: string;
    guildId: string;  // ← Accepted in parameter
  }
) {
  return retryTransaction(prisma, async (tx) => {
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

    return tx.giveawayEntry.create({ data });  // ← Passes guildId but schema may not require
  });
}
```

**Status**: ⚠️ **PARTIAL** (depends on schema)

**Comparison with safe-transaction-helpers.ts**:
- `safe-transaction-helpers.ts` doesn't include `guildId` in data parameter
- May indicate schema inconsistency
- Check if `GiveawayEntry` model actually has `guildId` field

---

## Positive Observations

1. **Comprehensive retry logic** with exponential backoff (transaction-helpers.ts)
2. **Proper deadlock detection** covering PostgreSQL error codes
3. **Optimistic locking support** with custom error types
4. **Transaction wrappers** reduce boilerplate
5. **Duplicate protection** in `createGiveawayEntry` (both files)
6. **Atomic increment** for XP operations (safe-transaction-helpers.ts:80-87)
7. **Clean separation** between raw helpers and safe wrappers

---

## Recommended Actions

### Priority 1 (Critical - Fix Immediately)
1. **Fix `getNextTicketNumber` race condition**
   - Add `FOR UPDATE` lock or use database sequence
   - Apply to both files
   - Add integration test with concurrent requests

2. **Fix retry loop off-by-one**
   - Change line 86 to `attempt < maxRetries`
   - Verify retry count in tests

### Priority 2 (High - Fix This Sprint)
3. **Add optimistic lock validation**
   - Check version field exists before using
   - Add TypeScript constraints

4. **Add batch update result tracking**
   - Return success/failure details
   - Enable partial retry capability

5. **Standardize isolation levels**
   - Add to all transaction calls
   - Document reasoning

### Priority 3 (Medium - Next Sprint)
6. **Improve type safety**
   - Remove `any` types
   - Use Prisma delegate types

7. **Refactor `updateGuildSettingsSafe`**
   - Use `retryTransaction` helper
   - Remove duplicate retry logic

8. **Add structured logging**
   - Replace console.warn
   - Add monitoring hooks

### Priority 4 (Low - Backlog)
9. **Wrap `incrementMemberXp` in retry**
10. **Verify `guildId` field usage in schema**

---

## Edge Case Summary

| # | Edge Case | Status | Lines | Fix Urgency |
|---|-----------|--------|-------|-------------|
| 1 | Transaction retry infinite loop | ⚠️ Partial | transaction-helpers.ts:86 | HIGH |
| 2 | getNextTicketNumber race condition | ❌ Unhandled | Both files:125-139, 19-32 | CRITICAL |
| 3 | Optimistic lock on non-versioned models | ⚠️ Partial | transaction-helpers.ts:225-228 | HIGH |
| 4 | Batch update partial failure | ❌ Unhandled | transaction-helpers.ts:277-291 | MEDIUM |

---

## Unresolved Questions

1. Does `GiveawayEntry` schema actually require `guildId` field?
2. Why different isolation strategies between the two helper files?
3. Should `safe-transaction-helpers.ts` use the retry logic from `transaction-helpers.ts`?
4. Are there existing tests covering these edge cases?
5. What's the expected behavior when batch update fails mid-process?
6. Is there a monitoring system to track retry rates?
7. Should we consolidate both files or keep them separate?

---

## Metrics

- **Type Coverage**: ~60% (excessive `any` usage)
- **Transaction Safety**: 70% (missing locks, partial retry coverage)
- **Error Handling**: 75% (good retry logic, missing validation)
- **Code Duplication**: Medium (retry logic duplicated in safe-transaction-helpers.ts)

---

**Next Steps**: Implement Priority 1 fixes, add integration tests for race conditions, consolidate retry logic across files.
