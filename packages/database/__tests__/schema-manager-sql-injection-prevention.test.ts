import { describe, it, expect } from 'vitest';
import { quoteIdentifier, getTenantSchemaName } from '../src/utils/safe-identifier-quote';

describe('Schema Manager Security', () => {
  describe('quoteIdentifier', () => {
    it('should quote valid identifiers', () => {
      expect(quoteIdentifier('tenant_abc123')).toBe('"tenant_abc123"');
      expect(quoteIdentifier('my_schema')).toBe('"my_schema"');
    });

    it('should reject SQL injection attempts', () => {
      expect(() => quoteIdentifier('tenant"; DROP SCHEMA public; --')).toThrow();
      expect(() => quoteIdentifier("tenant'; DELETE FROM users; --")).toThrow();
      expect(() => quoteIdentifier('tenant`; --')).toThrow();
    });

    it('should reject special characters', () => {
      expect(() => quoteIdentifier('tenant-with-dashes')).toThrow();
      expect(() => quoteIdentifier('tenant.with.dots')).toThrow();
      expect(() => quoteIdentifier('tenant with spaces')).toThrow();
    });

    it('should reject empty or too long identifiers', () => {
      expect(() => quoteIdentifier('')).toThrow();
      expect(() => quoteIdentifier('a'.repeat(100))).toThrow();
    });
  });

  describe('getTenantSchemaName', () => {
    it('should generate valid schema names', () => {
      expect(getTenantSchemaName('abc123')).toBe('tenant_abc123');
      expect(getTenantSchemaName('user_123')).toBe('tenant_user_123');
    });

    it('should reject invalid tenant IDs', () => {
      expect(() => getTenantSchemaName('')).toThrow();
      expect(() => getTenantSchemaName('a'.repeat(100))).toThrow();
      expect(() => getTenantSchemaName('tenant"; DROP TABLE users;--')).toThrow();
    });

    it('should sanitize potentially dangerous characters', () => {
      const result = getTenantSchemaName('abc-123');
      expect(result).toBe('tenant_abc123'); // Dashes removed
    });
  });
});
