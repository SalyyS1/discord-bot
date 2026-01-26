/**
 * Encryption Service Unit Tests
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { EncryptionService, generateEncryptionKey } from '../src/encryption';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const TEST_KEY = 'test-key-32-chars-minimum-secure';

  beforeEach(() => {
    service = new EncryptionService(TEST_KEY);
  });

  describe('constructor', () => {
    test('should create instance with valid key', () => {
      expect(() => new EncryptionService(TEST_KEY)).not.toThrow();
    });

    test('should throw error for short key', () => {
      expect(() => new EncryptionService('short')).toThrow();
    });

    test('should throw error for empty key', () => {
      expect(() => new EncryptionService('')).toThrow();
    });
  });

  describe('encrypt/decrypt', () => {
    test('should encrypt and decrypt correctly', () => {
      const original = 'MTIzNDU2Nzg5.ABCDEF.xyz123456789';
      
      const encrypted = service.encrypt(original);
      expect(encrypted).not.toBe(original);
      
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test('should handle special characters', () => {
      const original = 'token-with-special!@#$%^&*()_+=chars';
      
      const encrypted = service.encrypt(original);
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe(original);
    });

    test('should handle long strings', () => {
      const original = 'A'.repeat(10000);
      
      const encrypted = service.encrypt(original);
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe(original);
    });

    test('should handle unicode characters', () => {
      const original = 'token-with-unicode-🔐🔑-chars';
      
      const encrypted = service.encrypt(original);
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe(original);
    });

    test('should produce different ciphertexts for same plaintext (random IV)', () => {
      const original = 'same-token-different-cipher';
      
      const encrypted1 = service.encrypt(original);
      const encrypted2 = service.encrypt(original);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // Both should decrypt to same value
      expect(service.decrypt(encrypted1)).toBe(original);
      expect(service.decrypt(encrypted2)).toBe(original);
    });

    test('should throw on empty plaintext', () => {
      expect(() => service.encrypt('')).toThrow();
    });

    test('should throw on invalid ciphertext format', () => {
      expect(() => service.decrypt('invalid-format')).toThrow();
      expect(() => service.decrypt('a:b')).toThrow();
      expect(() => service.decrypt('')).toThrow();
    });

    test('should throw on tampered ciphertext', () => {
      const original = 'test-token';
      const encrypted = service.encrypt(original);
      
      // Tamper with the encrypted data
      const parts = encrypted.split(':');
      parts[2] = parts[2].replace(/[0-9a-f]/gi, '0');
      const tampered = parts.join(':');
      
      expect(() => service.decrypt(tampered)).toThrow();
    });

    test('different keys should not decrypt each other', () => {
      const service2 = new EncryptionService('different-key-32-chars-minimum!');
      const original = 'test-token';
      
      const encrypted = service.encrypt(original);
      
      expect(() => service2.decrypt(encrypted)).toThrow();
    });
  });

  describe('isEncrypted', () => {
    test('should return true for valid encrypted format', () => {
      const encrypted = service.encrypt('test');
      expect(EncryptionService.isEncrypted(encrypted)).toBe(true);
    });

    test('should return false for plain text', () => {
      expect(EncryptionService.isEncrypted('plain-text')).toBe(false);
      expect(EncryptionService.isEncrypted('MTIzNDU2.TOKEN.xyz')).toBe(false);
    });

    test('should return false for malformed data', () => {
      expect(EncryptionService.isEncrypted('')).toBe(false);
      expect(EncryptionService.isEncrypted('a:b')).toBe(false);
      expect(EncryptionService.isEncrypted('a:b:c')).toBe(false);
      expect(EncryptionService.isEncrypted(null as any)).toBe(false);
      expect(EncryptionService.isEncrypted(undefined as any)).toBe(false);
    });
  });
});

describe('generateEncryptionKey', () => {
  test('should generate key of specified length', () => {
    const key = generateEncryptionKey(32);
    // Base64 encoding increases length
    expect(key.length).toBeGreaterThan(32);
  });

  test('should generate unique keys', () => {
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();
    expect(key1).not.toBe(key2);
  });

  test('should generate keys usable by EncryptionService', () => {
    const key = generateEncryptionKey();
    expect(() => new EncryptionService(key)).not.toThrow();
  });
});
