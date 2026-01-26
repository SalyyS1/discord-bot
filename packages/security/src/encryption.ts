/**
 * AES-256-GCM Encryption Service for secure credential storage
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT = 'kisbot-tenant-encryption-v1';

export class EncryptionService {
  private key: Buffer;

  constructor(encryptionKey: string) {
    if (!encryptionKey || encryptionKey.length < 16) {
      throw new Error('Encryption key must be at least 16 characters');
    }
    // Derive a fixed-length key from the provided secret using scrypt
    this.key = crypto.scryptSync(encryptionKey, SALT, KEY_LENGTH);
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   * @param plaintext - The text to encrypt
   * @returns Encrypted string in format: iv:authTag:ciphertext (all hex-encoded)
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
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   * @param ciphertext - Encrypted string in format: iv:authTag:ciphertext
   * @returns Decrypted plaintext
   * @throws Error if decryption fails (tampered data, wrong key, etc.)
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext || !ciphertext.includes(':')) {
      throw new Error('Invalid ciphertext format');
    }

    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format: expected iv:authTag:encrypted');
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
   * Verify if a string is encrypted (matches expected format)
   */
  static isEncrypted(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    const parts = str.split(':');
    if (parts.length !== 3) return false;
    
    // Check if all parts are valid hex
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
    if (!key) {
      throw new Error(
        'TENANT_ENCRYPTION_KEY environment variable is not set. ' +
        'Generate a secure key and add it to your .env file.'
      );
    }
    encryptionService = new EncryptionService(key);
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
