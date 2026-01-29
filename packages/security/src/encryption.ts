/**
 * AES-256-GCM Encryption Service for secure credential storage
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const LEGACY_SALT = 'kisbot-tenant-encryption-v1'; // Keep for decryption only
const CURRENT_VERSION = 2;

interface EncryptionConfig {
  encryptionKey: string;
  installationSalt?: string;
}

export class EncryptionService {
  private key: Buffer;
  private legacyKey: Buffer | null = null;
  private version: number;

  constructor(config: string | EncryptionConfig) {
    // Support legacy constructor signature (string) and new signature (config object)
    const encryptionKey = typeof config === 'string' ? config : config.encryptionKey;
    const installationSalt = typeof config === 'string' ? undefined : config.installationSalt;

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
   * Generate installation-specific salt
   * @private
   */
  private generateInstallationSalt(): string {
    // Generate a random salt and log warning
    const randomSalt = crypto.randomBytes(16).toString('hex');
    console.warn(
      '[SECURITY WARNING] TENANT_ENCRYPTION_SALT not set. Generated random salt. ' +
      'This should be set in production to ensure consistent encryption across restarts.'
    );
    return randomSalt;
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   * @param plaintext - The text to encrypt
   * @returns Encrypted string in format: version:iv:authTag:ciphertext (all hex-encoded)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty string');
    }

    // Generate random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: version:iv:authTag:encrypted
    return `${this.version}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   * @param ciphertext - Encrypted string in format: version:iv:authTag:ciphertext or legacy iv:authTag:ciphertext
   * @returns Decrypted plaintext
   * @throws Error if decryption fails (tampered data, wrong key, etc.)
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext || !ciphertext.includes(':')) {
      throw new Error('Invalid ciphertext format');
    }

    const parts = ciphertext.split(':');

    // Legacy format: iv:authTag:encrypted (3 parts)
    if (parts.length === 3) {
      return this.decryptLegacy(ciphertext);
    }

    // New format: version:iv:authTag:encrypted (4 parts)
    if (parts.length === 4) {
      const version = parseInt(parts[0], 10);
      if (version === 1) {
        // Version 1 explicitly marked
        return this.decryptLegacy(parts.slice(1).join(':'));
      } else if (version === 2) {
        // Version 2 with dynamic salt
        return this.decryptV2(parts.slice(1).join(':'));
      } else {
        throw new Error(`Unsupported encryption version: ${version}`);
      }
    }

    throw new Error('Invalid ciphertext format: expected version:iv:authTag:encrypted or iv:authTag:encrypted');
  }

  /**
   * Decrypt legacy format (version 1) using legacy key
   * @private
   */
  private decryptLegacy(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid legacy ciphertext format');
    }

    const [ivHex, authTagHex, encrypted] = parts;

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      if (iv.length !== IV_LENGTH) {
        throw new Error('Invalid IV length');
      }
      if (authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid auth tag length');
      }

      if (!this.legacyKey) {
        throw new Error('Legacy key not available');
      }

      const decipher = crypto.createDecipheriv(ALGORITHM, this.legacyKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      if (error.message.includes('Unsupported state')) {
        throw new Error('Decryption failed: data may be corrupted or key is wrong');
      }
      throw error;
    }
  }

  /**
   * Decrypt version 2 format using current key
   * @private
   */
  private decryptV2(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid v2 ciphertext format');
    }

    const [ivHex, authTagHex, encrypted] = parts;

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      if (iv.length !== IV_LENGTH) {
        throw new Error('Invalid IV length');
      }
      if (authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid auth tag length');
      }

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      if (error.message.includes('Unsupported state')) {
        throw new Error('Decryption failed: data may be corrupted or key is wrong');
      }
      throw error;
    }
  }

  /**
   * Re-encrypt data from legacy format to current version
   * @param ciphertext - Encrypted string in any supported format
   * @returns Re-encrypted string in current format
   */
  reencrypt(ciphertext: string): string {
    const plaintext = this.decrypt(ciphertext);
    return this.encrypt(plaintext);
  }

  /**
   * Check if ciphertext is in legacy format (version 1)
   * @param ciphertext - Encrypted string to check
   * @returns True if legacy format
   */
  isLegacyEncryption(ciphertext: string): boolean {
    if (!ciphertext || typeof ciphertext !== 'string') {
      return false;
    }

    const parts = ciphertext.split(':');

    // Legacy format: 3 parts (iv:authTag:encrypted)
    if (parts.length === 3) {
      return true;
    }

    // Explicitly marked version 1
    if (parts.length === 4 && parts[0] === '1') {
      return true;
    }

    return false;
  }

  /**
   * Verify if a string is encrypted (matches expected format)
   */
  static isEncrypted(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    const parts = str.split(':');

    // Legacy format: 3 parts (iv:authTag:encrypted)
    if (parts.length === 3) {
      const [iv, authTag, encrypted] = parts;
      const hexRegex = /^[0-9a-f]+$/i;

      return (
        hexRegex.test(iv) &&
        iv.length === IV_LENGTH * 2 &&
        hexRegex.test(authTag) &&
        authTag.length === AUTH_TAG_LENGTH * 2 &&
        hexRegex.test(encrypted) &&
        encrypted.length > 0
      );
    }

    // New format: 4 parts (version:iv:authTag:encrypted)
    if (parts.length === 4) {
      const [version, iv, authTag, encrypted] = parts;
      const hexRegex = /^[0-9a-f]+$/i;
      const versionNum = parseInt(version, 10);

      return (
        !isNaN(versionNum) &&
        versionNum >= 1 &&
        versionNum <= CURRENT_VERSION &&
        hexRegex.test(iv) &&
        iv.length === IV_LENGTH * 2 &&
        hexRegex.test(authTag) &&
        authTag.length === AUTH_TAG_LENGTH * 2 &&
        hexRegex.test(encrypted) &&
        encrypted.length > 0
      );
    }

    return false;
  }
}

// Singleton instance
let encryptionService: EncryptionService | null = null;

/**
 * Get the singleton encryption service instance
 * @throws Error if TENANT_ENCRYPTION_KEY environment variable is not set
 */
export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    const key = process.env.TENANT_ENCRYPTION_KEY;
    const salt = process.env.TENANT_ENCRYPTION_SALT;

    if (!key) {
      throw new Error(
        'TENANT_ENCRYPTION_KEY environment variable is not set. ' +
        'Generate a secure key and add it to your .env file.'
      );
    }

    encryptionService = new EncryptionService({
      encryptionKey: key,
      installationSalt: salt
    });
  }
  return encryptionService;
}

/**
 * Clear the encryption service singleton (useful for testing)
 */
export function clearEncryptionService(): void {
  encryptionService = null;
}

/**
 * Generate a secure random encryption key
 * @param length - Length of the key in bytes (default: 32)
 * @returns Base64-encoded key
 */
export function generateEncryptionKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64');
}
