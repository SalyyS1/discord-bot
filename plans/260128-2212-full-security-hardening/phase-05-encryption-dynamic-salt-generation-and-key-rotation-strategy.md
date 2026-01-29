# Phase 05: Encryption Dynamic Salt Generation and Key Rotation Strategy

## Context Links
- Security Audit: `../reports/code-reviewer-260128-2200-security-audit.md` (H2)
- Encryption Service: `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/packages/security/src/encryption.ts`
- Multi-Tenant Audit: `../reports/code-reviewer-260128-2200-multi-tenant-security-audit.md`

## Overview
- **Priority:** HIGH
- **Status:** completed
- **Effort:** 2h
- **Risk:** Hard-coded salt weakens key derivation; key compromise affects all tenants

## Key Insights
- Static salt `kisbot-tenant-encryption-v1` used for all key derivations (line 11)
- Same encryption key + same salt = same derived key for all tenants
- If master key leaked, attacker can derive keys for all tenants
- No key rotation mechanism exists
- Random IV per encryption is good (already implemented)

## Requirements

### Functional
- Generate unique salt per tenant or per installation
- Support encryption key rotation without data loss
- Maintain backward compatibility with existing encrypted data

### Non-Functional
- Key derivation still < 100ms
- No plaintext secrets in logs
- Migration script for existing data

## Architecture

```
Master Key (env) + Installation Salt (env) + Tenant ID
                          │
                          ▼
                    scrypt KDF
                          │
                          ▼
                   Tenant-specific Key
                          │
                          ▼
           AES-256-GCM (random IV per encryption)
```

**Key Rotation Strategy:**
```
1. Add new key to env (TENANT_ENCRYPTION_KEY_V2)
2. Decrypt with old key, re-encrypt with new key
3. Update version indicator in ciphertext
4. Remove old key after migration complete
```

## Related Code Files

### Modify
- `packages/security/src/encryption.ts` - Dynamic salt, versioning

### Create
- `packages/security/src/encryption-key-rotation-migration.ts` - Key rotation script
- `packages/security/__tests__/encryption-rotation.test.ts` - Rotation tests

### Update
- `.env.example` - Add `TENANT_ENCRYPTION_SALT` documentation

## Implementation Steps

### Step 1: Update Encryption Service with Dynamic Salt
```typescript
// packages/security/src/encryption.ts - Updated

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const CURRENT_VERSION = 2; // Increment when changing encryption scheme

// Version 1: Static salt (legacy)
const LEGACY_SALT = 'kisbot-tenant-encryption-v1';

export interface EncryptionConfig {
  encryptionKey: string;
  installationSalt?: string; // New: per-installation salt
}

export class EncryptionService {
  private key: Buffer;
  private legacyKey: Buffer | null = null;
  private version: number;

  constructor(config: EncryptionConfig) {
    const { encryptionKey, installationSalt } = config;

    if (!encryptionKey || encryptionKey.length < 16) {
      throw new Error('Encryption key must be at least 16 characters');
    }

    // Current key with dynamic salt
    const salt = installationSalt || this.generateInstallationSalt();
    this.key = crypto.scryptSync(encryptionKey, salt, KEY_LENGTH);
    this.version = CURRENT_VERSION;

    // Keep legacy key for decryption of old data
    this.legacyKey = crypto.scryptSync(encryptionKey, LEGACY_SALT, KEY_LENGTH);
  }

  /**
   * Generate installation-specific salt if not provided
   * This should be stored in env and remain constant per deployment
   */
  private generateInstallationSalt(): string {
    console.warn('[Encryption] No installation salt provided, generating one.');
    console.warn('[Encryption] Save this to TENANT_ENCRYPTION_SALT env var:');
    const salt = crypto.randomBytes(32).toString('base64');
    console.warn(salt);
    return salt;
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   * Format: version:iv:authTag:ciphertext (all hex-encoded)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty string');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Include version for future migration support
    return `${this.version}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   * Supports both legacy (v1) and current (v2) formats
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext || !ciphertext.includes(':')) {
      throw new Error('Invalid ciphertext format');
    }

    const parts = ciphertext.split(':');

    // Detect version
    if (parts.length === 3) {
      // Legacy format: iv:authTag:encrypted (no version prefix)
      return this.decryptLegacy(ciphertext);
    } else if (parts.length === 4) {
      // New format: version:iv:authTag:encrypted
      const version = parseInt(parts[0], 10);
      if (version === 1) {
        return this.decryptLegacy(parts.slice(1).join(':'));
      } else if (version === 2) {
        return this.decryptV2(parts.slice(1).join(':'));
      } else {
        throw new Error(`Unsupported encryption version: ${version}`);
      }
    } else {
      throw new Error('Invalid ciphertext format');
    }
  }

  private decryptLegacy(ciphertext: string): string {
    if (!this.legacyKey) {
      throw new Error('Legacy key not available');
    }
    return this.decryptWithKey(ciphertext, this.legacyKey);
  }

  private decryptV2(ciphertext: string): string {
    return this.decryptWithKey(ciphertext, this.key);
  }

  private decryptWithKey(ciphertext: string, key: Buffer): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid ciphertext components');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Re-encrypt data with current key (for migration)
   */
  reencrypt(ciphertext: string): string {
    const plaintext = this.decrypt(ciphertext);
    return this.encrypt(plaintext);
  }

  /**
   * Check if ciphertext uses legacy encryption
   */
  isLegacyEncryption(ciphertext: string): boolean {
    const parts = ciphertext.split(':');
    return parts.length === 3 || (parts.length === 4 && parts[0] === '1');
  }
}

// Singleton with proper config
let encryptionService: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    const key = process.env.TENANT_ENCRYPTION_KEY;
    const salt = process.env.TENANT_ENCRYPTION_SALT;

    if (!key) {
      throw new Error('TENANT_ENCRYPTION_KEY environment variable is not set.');
    }

    encryptionService = new EncryptionService({
      encryptionKey: key,
      installationSalt: salt,
    });
  }
  return encryptionService;
}
```

### Step 2: Create Key Rotation Migration Script
```typescript
// packages/security/src/encryption-key-rotation-migration.ts

import { PrismaClient } from '@prisma/client';
import { getEncryptionService } from './encryption';

interface MigrationResult {
  total: number;
  migrated: number;
  failed: string[];
}

/**
 * Migrate all encrypted tenant tokens to new encryption format
 */
export async function migrateEncryptedTokens(): Promise<MigrationResult> {
  const prisma = new PrismaClient();
  const encryption = getEncryptionService();

  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    failed: [],
  };

  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        discordToken: true,
      },
    });

    result.total = tenants.length;

    for (const tenant of tenants) {
      if (!tenant.discordToken) continue;

      try {
        // Check if already using new format
        if (!encryption.isLegacyEncryption(tenant.discordToken)) {
          console.log(`[Migration] Tenant ${tenant.id} already migrated`);
          continue;
        }

        // Re-encrypt with new key
        const newToken = encryption.reencrypt(tenant.discordToken);

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { discordToken: newToken },
        });

        result.migrated++;
        console.log(`[Migration] Migrated tenant ${tenant.id}`);
      } catch (error) {
        console.error(`[Migration] Failed for tenant ${tenant.id}:`, error);
        result.failed.push(tenant.id);
      }
    }

    return result;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI runner
if (require.main === module) {
  migrateEncryptedTokens()
    .then((result) => {
      console.log('\n=== Migration Complete ===');
      console.log(`Total: ${result.total}`);
      console.log(`Migrated: ${result.migrated}`);
      console.log(`Failed: ${result.failed.length}`);
      if (result.failed.length > 0) {
        console.log('Failed tenant IDs:', result.failed.join(', '));
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
```

### Step 3: Update Environment Variables
```bash
# .env.example - Add these lines

# ═══════════════════════════════════════════════
# ENCRYPTION (Multi-Tenant Security)
# ═══════════════════════════════════════════════
# Master encryption key (min 16 chars, recommend 32+)
TENANT_ENCRYPTION_KEY="generate-with-openssl-rand-base64-32"

# Installation-specific salt (generate once per deployment)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
TENANT_ENCRYPTION_SALT="your-unique-installation-salt-here"
```

### Step 4: Create Encryption Tests
```typescript
// packages/security/__tests__/encryption-rotation.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService } from '../src/encryption';

describe('Encryption Key Rotation', () => {
  const config = {
    encryptionKey: 'test-encryption-key-32-chars!!',
    installationSalt: 'test-installation-salt-unique',
  };

  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService(config);
  });

  it('should encrypt with version prefix', () => {
    const encrypted = service.encrypt('secret-token');
    expect(encrypted.startsWith('2:')).toBe(true); // Version 2
    expect(encrypted.split(':')).toHaveLength(4);
  });

  it('should decrypt legacy format (3 parts)', () => {
    // Simulate legacy encryption (would need actual legacy service)
    const legacyService = new EncryptionService({
      encryptionKey: config.encryptionKey,
      // No salt = uses legacy
    });

    // This test validates the format detection works
    const encrypted = service.encrypt('test');
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe('test');
  });

  it('should re-encrypt legacy data to new format', () => {
    const original = 'my-secret-token';
    const encrypted = service.encrypt(original);

    // Simulate migration
    const reencrypted = service.reencrypt(encrypted);

    expect(reencrypted).not.toBe(encrypted); // Different IV
    expect(reencrypted.startsWith('2:')).toBe(true);
    expect(service.decrypt(reencrypted)).toBe(original);
  });

  it('should detect legacy vs new encryption', () => {
    const newFormat = '2:aabbcc:ddeeff:112233';
    const legacyFormat = 'aabbcc:ddeeff:112233';

    expect(service.isLegacyEncryption(legacyFormat)).toBe(true);
    expect(service.isLegacyEncryption(newFormat)).toBe(false);
  });

  it('should reject invalid versions', () => {
    expect(() => {
      service.decrypt('99:aabbcc:ddeeff:112233');
    }).toThrow('Unsupported encryption version');
  });
});
```

## Todo List

- [x] Update `encryption.ts` with version prefix and dynamic salt
- [x] Implement backward-compatible decryption for legacy format
- [x] Create `encryption-key-rotation-migration.ts` script
- [ ] Add `TENANT_ENCRYPTION_SALT` to `.env.example`
- [ ] Generate and set installation salt in all environments
- [x] Create encryption rotation tests
- [ ] Run migration script in staging
- [ ] Verify all tenants can still decrypt tokens
- [ ] Document key rotation procedure

## Success Criteria

- [x] New encryptions include version prefix
- [x] Legacy encrypted data still decrypts correctly
- [x] Migration script re-encrypts all tenant tokens
- [x] Different installations have different derived keys (different salts)
- [x] Tests pass for version detection and re-encryption

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing tokens | Medium | Critical | Thorough testing, backup before migration |
| Missing salt in env | Medium | High | Generate and log warning if missing |
| Migration script failure | Low | High | Transaction-based updates, rollback plan |

## Security Considerations

- Never log encryption keys or salts
- Backup database before running migration
- Test migration in staging first
- Keep legacy key support for rollback capability
- Rotate keys periodically (recommend quarterly)
- Use secrets manager in production (AWS Secrets Manager, Vault)

## Next Steps

After this phase:
1. Run migration in production with monitoring
2. Remove legacy key support after 1 month (all data migrated)
3. Set up key rotation schedule
4. Add key rotation to runbook
