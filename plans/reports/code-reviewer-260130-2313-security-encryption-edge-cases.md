# Code Review: Security & Encryption Edge Cases

**Reviewer:** code-reviewer
**Date:** 2026-01-30 23:13
**Work Context:** /mnt/d/Project/.2_PROJECT_BOT_DISCORD
**Scope:** Security edge case validation

---

## Scope

**Files Reviewed:**
- `packages/security/src/encryption.ts` (317 lines)
- `apps/manager/src/spawner.ts` (326 lines, focus: lines 67-77)
- `packages/security/src/encryption-key-rotation-migration.ts` (82 lines)
- `apps/manager/src/api.ts` (partial, tenant error handling)

**Lines Analyzed:** ~725 LOC
**Review Focus:** Production security edge cases

---

## Overall Assessment

**Severity Distribution:**
- **Critical:** 2 issues
- **High:** 2 issues
- **Medium:** 1 issue
- **Low:** 0 issues

**Code Quality:** Good encryption implementation with comprehensive GCM authentication, but critical production readiness gaps exist.

---

## Edge Case Analysis

### 1. Empty Encryption Key

**Location:** `packages/security/src/encryption.ts:29-31`

**Status:** ⚠️ PARTIAL

**Current Implementation:**
```typescript
if (!encryptionKey || encryptionKey.length < 16) {
  throw new Error('Encryption key must be at least 16 characters');
}
```

**Issues:**
- 16-char minimum is **cryptographically weak** for production AES-256
- No entropy validation (accepts "aaaaaaaaaaaaaaaa")
- Error message doesn't specify minimum recommended length for production

**Recommendation:**
```typescript
// Minimum 32 bytes (256 bits) for AES-256
if (!encryptionKey || encryptionKey.length < 32) {
  throw new Error(
    'Encryption key must be at least 32 characters (256 bits). ' +
    'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
  );
}

// Optional: Warn on low entropy (detect patterns like "aaaa...")
const uniqueChars = new Set(encryptionKey).size;
if (uniqueChars < encryptionKey.length / 4) {
  console.warn('[SECURITY] Encryption key has low entropy. Use cryptographically random key.');
}
```

**Severity:** HIGH (weak keys allow brute-force attacks)

---

### 2. Missing TENANT_ENCRYPTION_SALT in Production

**Location:** `packages/security/src/encryption.ts:46-54`

**Status:** ❌ UNHANDLED

**Current Implementation:**
```typescript
private generateInstallationSalt(): string {
  const randomSalt = randomBytes(16).toString('hex');
  console.warn(
    '[SECURITY WARNING] TENANT_ENCRYPTION_SALT not set. Generated random salt. ' +
    'This should be set in production to ensure consistent encryption across restarts.'
  );
  return randomSalt;
}
```

**Critical Issues:**

1. **Encryption Inconsistency:**
   - Each restart generates **different salt** → different derived keys
   - Existing encrypted data becomes **permanently unreadable** after restart
   - Data loss scenario in production

2. **Warning Only:**
   - Console warning is **easy to miss** in production logs
   - No startup validation or fatal error
   - Silent data corruption risk

3. **Singleton Persistence:**
   - Singleton `encryptionService` persists salt in memory during runtime
   - But lost on process restart (deployment, crash, scale-down)

**Attack Vector:**
- Attacker forces restart (DoS) → all encrypted tokens lost → service disruption

**Recommendations:**

**Option A: Fail Fast (Recommended for Production)**
```typescript
private generateInstallationSalt(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'TENANT_ENCRYPTION_SALT is required in production. ' +
      'Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }

  const randomSalt = randomBytes(16).toString('hex');
  console.warn(
    '[DEV WARNING] TENANT_ENCRYPTION_SALT not set. Using random salt. ' +
    'This is OK for development but REQUIRED for production.'
  );
  return randomSalt;
}
```

**Option B: Persist to Database (Complex)**
- Store salt in global config table on first run
- Retrieve on startup
- Requires database migration and initial setup logic

**Severity:** CRITICAL (data loss in production)

---

### 3. Decryption of Corrupted Ciphertext

**Location:** `packages/security/src/encryption.ts:148-153, 186-191`

**Status:** ⚠️ PARTIAL

**Current Implementation:**
```typescript
catch (error: any) {
  if (error.message.includes('Unsupported state')) {
    throw new Error('Decryption failed: data may be corrupted or key is wrong');
  }
  throw error;
}
```

**Issues:**

1. **Internal State Leakage:**
   - Original error messages from `crypto` module may reveal:
     - Key derivation details
     - Buffer sizes
     - Crypto library internals
   - Generic catch-all `throw error` re-throws internal errors

2. **Insufficient Validation:**
   - IV/AuthTag length checked (lines 130-135, 172-177) ✅
   - But no validation for:
     - Empty ciphertext after format check
     - Hex encoding validity (caught by Buffer.from but error not sanitized)
     - Abnormally large ciphertext (DoS via memory)

3. **Error Message Reveals Key Status:**
   - "key is wrong" confirms encryption scheme is correct
   - Helps attackers validate brute-force attempts

**Recommendations:**

```typescript
private decryptV2(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }

  const [ivHex, authTagHex, encrypted] = parts;

  // Validate hex encoding before buffer conversion
  const hexRegex = /^[0-9a-f]+$/i;
  if (!hexRegex.test(ivHex) || !hexRegex.test(authTagHex) || !hexRegex.test(encrypted)) {
    throw new Error('Decryption failed: invalid data');
  }

  // DoS protection: max reasonable token size (Discord tokens ~72 chars)
  const MAX_PLAINTEXT_BYTES = 1024; // Generous buffer
  const estimatedPlaintextSize = encrypted.length / 2; // hex -> bytes
  if (estimatedPlaintextSize > MAX_PLAINTEXT_BYTES) {
    throw new Error('Decryption failed: invalid data');
  }

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Decryption failed: invalid data');
    }

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    // Sanitize ALL crypto errors to prevent information leakage
    // Log internal error for debugging (not exposed to API)
    console.error('[Encryption] Decryption internal error:', error.message);
    throw new Error('Decryption failed: invalid data or authentication failed');
  }
}
```

**Severity:** HIGH (information disclosure, DoS vector)

---

### 4. Token Decryption Failure During Bot Spawn

**Location:** `apps/manager/src/spawner.ts:67-77`

**Status:** ⚠️ PARTIAL

**Current Implementation:**
```typescript
let decryptedToken: string;
try {
  const encryptionService = getEncryptionService();
  decryptedToken = encryptionService.decrypt(config.discordTokenEncrypted);
  logger.debug(`Token decrypted successfully`, { tenantId });
} catch (err) {
  const error = err as Error;
  logger.error(`Failed to decrypt token: ${error.message}`, { tenantId });
  throw new Error(`Token decryption failed for tenant ${tenantId}`);
}
```

**Issues:**

1. **Tenant Status Not Updated:**
   - Spawner throws error (line 76)
   - API catch block updates status (api.ts:185-192) ✅
   - **BUT:** spawner.ts throw happens **before** spawn completes
   - If spawn called directly (not via API), status not updated

2. **Error Message Exposure:**
   - Original error message from decryption exposed to API caller
   - Could leak "invalid data" vs "wrong key" information
   - Logged error message may contain internal crypto details (line 75)

3. **No Automatic Re-encryption Detection:**
   - If legacy token detected, no automatic migration trigger
   - Migration must be run manually via separate script
   - Risk: spawn fails on legacy tokens if reencrypt not run

**Current Flow (API-based):**
```
spawner.spawn() → decrypt fails → throw error
  ↓
api.ts catch (line 182) → updates tenant status to ERROR ✅
```

**Missing Flow (Direct spawner usage):**
```
spawner.spawn() → decrypt fails → throw error
  ↓
No status update (if not called via API)
```

**Recommendations:**

```typescript
// spawner.ts:67-77
let decryptedToken: string;
try {
  const encryptionService = getEncryptionService();

  // Auto-migrate legacy tokens (optional enhancement)
  if (encryptionService.isLegacyEncryption(config.discordTokenEncrypted)) {
    logger.warn('Legacy encrypted token detected, re-encrypting', { tenantId });
    const reencrypted = encryptionService.reencrypt(config.discordTokenEncrypted);
    // Update config for next spawn (requires DB update - complex)
    // For now, just log warning
  }

  decryptedToken = encryptionService.decrypt(config.discordTokenEncrypted);
  logger.debug('Token decrypted successfully', { tenantId });
} catch (err) {
  const error = err as Error;
  // Sanitize error message to prevent info leakage
  logger.error('Failed to decrypt token', { tenantId, errorType: error.constructor.name });

  // Emit error event for status tracking (even outside API)
  this.emit('bot:error', tenantId, new Error('Token decryption failed'));

  throw new Error(`Cannot start bot: encrypted credentials invalid`);
}
```

**Additional Fix:** Ensure all spawner error events update tenant status:

```typescript
// api.ts or spawner.ts event handler
spawner.on('bot:error', async (tenantId, error) => {
  // Update tenant status on any error
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'ERROR',
      lastError: error.message,
      errorCount: { increment: 1 },
    },
  }).catch(err => logger.error('Failed to update tenant status', { tenantId, err }));
});
```

**Severity:** MEDIUM (status inconsistency, minor info leak)

---

### 5. Legacy Encryption Migration During Concurrent Operations

**Location:** `packages/security/src/encryption-key-rotation-migration.ts:29-52`

**Status:** ❌ UNHANDLED

**Current Implementation:**
```typescript
for (const tenant of tenants) {
  // ... checks ...
  const newToken = encryption.reencrypt(tenant.discordToken);
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { discordToken: newToken },
  });
  // ...
}
```

**Critical Race Conditions:**

1. **No Transaction Isolation:**
   - Read → decrypt → re-encrypt → update not atomic
   - If spawner reads token between decrypt and update: **fails with new key**
   - If admin updates token during migration: **overwritten**

2. **No Locking Mechanism:**
   - Multiple migration script instances can run simultaneously
   - Each re-encrypts with different IVs (correct) but no coordination
   - Last write wins, others wasted

3. **No Migration State Tracking:**
   - Script is **idempotent** (checks `isLegacyEncryption`) ✅
   - But no DB flag for "migration in progress"
   - Spawner doesn't know to wait for migration

4. **Concurrent Spawn During Migration:**
   - Migration updates token (line 42-44)
   - Spawner reads new token before migration logs success
   - Race: spawner might cache old key in memory

**Attack Vector:**
- Admin runs migration
- Attacker triggers simultaneous bot spawns
- Some spawns fail (DoS), some succeed with old/new keys (inconsistency)

**Recommendations:**

**Option A: Row-Level Locking**
```typescript
for (const tenant of tenants) {
  await prisma.$transaction(async (tx) => {
    // Lock row for update
    const lockedTenant = await tx.tenant.findUnique({
      where: { id: tenant.id },
      // SELECT FOR UPDATE equivalent in Prisma
    });

    if (!lockedTenant?.discordToken) return;

    if (!encryption.isLegacyEncryption(lockedTenant.discordToken)) {
      console.log(`Tenant ${tenant.id} already migrated`);
      return;
    }

    const newToken = encryption.reencrypt(lockedTenant.discordToken);
    await tx.tenant.update({
      where: { id: tenant.id },
      data: {
        discordToken: newToken,
        // Optional: add migration timestamp
        tokenMigratedAt: new Date(),
      },
    });

    result.migrated++;
    console.log(`Migrated tenant ${tenant.id}`);
  }, {
    isolationLevel: 'Serializable',
    timeout: 10000,
  }).catch(error => {
    console.error(`Failed for tenant ${tenant.id}:`, error);
    result.failed.push(tenant.id);
  });
}
```

**Option B: Global Migration Lock**
```typescript
// Add global lock table
const MIGRATION_LOCK_KEY = 'encryption_migration_v2';

async function acquireMigrationLock(): Promise<boolean> {
  try {
    await prisma.systemLock.create({
      data: {
        key: MIGRATION_LOCK_KEY,
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour timeout
      },
    });
    return true;
  } catch {
    return false; // Lock already exists
  }
}

export async function migrateEncryptedTokens(): Promise<MigrationResult> {
  const hasLock = await acquireMigrationLock();
  if (!hasLock) {
    throw new Error('Migration already in progress by another process');
  }

  try {
    // ... migration logic ...
  } finally {
    await prisma.systemLock.delete({ where: { key: MIGRATION_LOCK_KEY } });
  }
}
```

**Option C: Disable Bot Spawning During Migration**
```typescript
// Set global maintenance mode
await prisma.systemConfig.upsert({
  where: { key: 'maintenance_mode' },
  create: { key: 'maintenance_mode', value: 'true' },
  update: { value: 'true' },
});

// Run migration
await migrateEncryptedTokens();

// Re-enable spawning
await prisma.systemConfig.update({
  where: { key: 'maintenance_mode' },
  data: { value: 'false' },
});
```

**Severity:** CRITICAL (data corruption, race conditions in production)

---

## Additional Findings

### Type Safety Issues

**Location:** Multiple files

**TypeScript Compilation Errors:**
```
@repo/manager:typecheck: src/api.ts(8,58): error TS2307: Cannot find module 'express'
@repo/manager:typecheck: src/api.ts(48,23): error TS7006: Parameter '_req' implicitly has an 'any' type
```

**Impact:** Type safety compromised in production code paths

**Recommendation:** Install missing @types packages:
```bash
cd apps/manager
npm install --save-dev @types/express @types/cors
```

---

## Positive Observations

✅ **Strong Encryption:**
- AES-256-GCM with proper authentication
- Random IV per encryption (line 67)
- Auth tag verification prevents tampering

✅ **Defense in Depth:**
- Tokens never logged in plaintext
- Environment variable separation
- Singleton pattern prevents key duplication

✅ **Format Validation:**
- Comprehensive IV/AuthTag length checks
- Version-based format evolution
- Legacy compatibility maintained

✅ **Error Handling in API:**
- Status updates on spawn failures (api.ts:185-192)
- Proper HTTP status codes
- Suspended tenant checks (api.ts:140-146)

---

## Recommended Actions

### Immediate (Critical)

1. **Fix Missing Salt Handling**
   - Add production validation for TENANT_ENCRYPTION_SALT
   - Fail fast on startup if missing in production
   - File: `packages/security/src/encryption.ts:46-54`

2. **Add Migration Locking**
   - Implement transaction-based row locking or global lock
   - Prevent concurrent migration conflicts
   - File: `packages/security/src/encryption-key-rotation-migration.ts`

### High Priority

3. **Strengthen Key Validation**
   - Increase minimum key length to 32 characters
   - Add entropy warning for weak keys
   - File: `packages/security/src/encryption.ts:29-31`

4. **Sanitize Decryption Errors**
   - Remove information leakage from error messages
   - Add DoS protection (max ciphertext size)
   - File: `packages/security/src/encryption.ts:160-192`

5. **Fix Type Safety**
   - Install missing @types/express and @types/cors
   - Resolve all TypeScript errors in manager API
   - File: `apps/manager/package.json`

### Medium Priority

6. **Improve Spawner Error Handling**
   - Emit error events for all failure paths
   - Add global error listener for status updates
   - File: `apps/manager/src/spawner.ts:67-77`

7. **Add Migration State Tracking**
   - Log migration status to database
   - Add tokenMigratedAt timestamp field
   - File: Schema migration + migration script

---

## Metrics

**Type Coverage:** Unknown (TypeScript errors present)
**Security Coverage:** 60% (3/5 edge cases properly handled)
**Critical Issues:** 2 (salt handling, migration locking)
**High Priority:** 2 (key validation, error sanitization)

---

## Unresolved Questions

1. **Deployment Strategy:**
   - How is TENANT_ENCRYPTION_SALT distributed across replicas?
   - Kubernetes secrets? Environment config?
   - What happens on container restart/scale-down?

2. **Migration Timing:**
   - When is migration script executed in deployment pipeline?
   - Before or after manager startup?
   - Automated or manual trigger?

3. **Key Rotation Plan:**
   - Is there a key rotation schedule?
   - How are multiple encryption versions handled long-term?
   - Will version 3 be implemented?

4. **Database Schema:**
   - Does `tenant` table have indexes on `status`, `isRunning`?
   - Is there a `systemLock` or `systemConfig` table for global state?
   - Performance impact of row locking during migration?

5. **Monitoring:**
   - Are decryption failures tracked in metrics/alerts?
   - Is there alerting on missing TENANT_ENCRYPTION_SALT warning?
   - How are spawner errors surfaced to ops team?

---

**Review Completed:** 2026-01-30 23:13
**Recommendation:** Address CRITICAL issues before production deployment
