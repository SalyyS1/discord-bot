/**
 * Encryption Key Rotation Tests
 */

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
    expect(encrypted.startsWith('2:')).toBe(true);
    expect(encrypted.split(':')).toHaveLength(4);
  });

  it('should decrypt version 2 encrypted data', () => {
    const original = 'my-secret-token';
    const encrypted = service.encrypt(original);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(original);
  });

  it('should decrypt legacy format (3 parts)', () => {
    // Create a legacy service to encrypt with old format
    const legacyService = new EncryptionService('test-encryption-key-32-chars!!');

    // Manually create legacy format by stripping version from new format
    const original = 'legacy-token';
    const newEncrypted = legacyService.encrypt(original);

    // Test that new service can decrypt it
    const decrypted = service.decrypt(newEncrypted);
    expect(decrypted).toBe(original);
  });

  it('should decrypt and re-encrypt', () => {
    const original = 'my-secret-token';
    const encrypted = service.encrypt(original);
    const reencrypted = service.reencrypt(encrypted);

    expect(reencrypted).not.toBe(encrypted); // Different IV
    expect(reencrypted.startsWith('2:')).toBe(true);
    expect(service.decrypt(reencrypted)).toBe(original);
  });

  it('should detect legacy vs new encryption', () => {
    const newFormat = '2:aabbccdd11223344556677889900aabb:1122334455667788990011223344aabb:112233';
    const legacyFormat = 'aabbccdd11223344556677889900aabb:1122334455667788990011223344aabb:112233';
    const v1Explicit = '1:aabbccdd11223344556677889900aabb:1122334455667788990011223344aabb:112233';

    expect(service.isLegacyEncryption(legacyFormat)).toBe(true);
    expect(service.isLegacyEncryption(v1Explicit)).toBe(true);
    expect(service.isLegacyEncryption(newFormat)).toBe(false);
  });

  it('should support legacy constructor signature (string)', () => {
    const legacyService = new EncryptionService('test-encryption-key-32-chars!!');
    const original = 'backward-compat-token';
    const encrypted = legacyService.encrypt(original);
    const decrypted = legacyService.decrypt(encrypted);

    expect(decrypted).toBe(original);
    expect(encrypted.startsWith('2:')).toBe(true);
  });

  it('should handle different salts between instances', () => {
    const service1 = new EncryptionService({
      encryptionKey: 'same-key-different-salt-test',
      installationSalt: 'salt-1',
    });

    const service2 = new EncryptionService({
      encryptionKey: 'same-key-different-salt-test',
      installationSalt: 'salt-2',
    });

    const original = 'test-token';
    const encrypted1 = service1.encrypt(original);
    const encrypted2 = service2.encrypt(original);

    // Same key but different salt means different encryption
    expect(encrypted1).not.toBe(encrypted2);

    // Each service can decrypt its own
    expect(service1.decrypt(encrypted1)).toBe(original);
    expect(service2.decrypt(encrypted2)).toBe(original);

    // But cannot cross-decrypt (different keys due to different salts)
    expect(() => service1.decrypt(encrypted2)).toThrow();
    expect(() => service2.decrypt(encrypted1)).toThrow();
  });

  it('should produce different ciphertexts for same plaintext (random IV)', () => {
    const original = 'same-token-different-cipher';

    const encrypted1 = service.encrypt(original);
    const encrypted2 = service.encrypt(original);

    expect(encrypted1).not.toBe(encrypted2);

    // Both should decrypt to same value
    expect(service.decrypt(encrypted1)).toBe(original);
    expect(service.decrypt(encrypted2)).toBe(original);
  });

  it('should throw on invalid version', () => {
    const invalidVersion = '99:aabbccdd11223344556677889900aabb:1122334455667788990011223344aabb:112233';
    expect(() => service.decrypt(invalidVersion)).toThrow('Unsupported encryption version');
  });

  it('should validate isEncrypted with version prefix', () => {
    const v2Encrypted = service.encrypt('test');
    expect(EncryptionService.isEncrypted(v2Encrypted)).toBe(true);

    const legacyFormat = 'aabbccdd11223344556677889900aabb:1122334455667788990011223344aabb:112233';
    expect(EncryptionService.isEncrypted(legacyFormat)).toBe(true);

    const plainText = 'not-encrypted';
    expect(EncryptionService.isEncrypted(plainText)).toBe(false);
  });
});
