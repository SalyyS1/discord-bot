/**
 * Token Validator Unit Tests
 */

import { describe, test, expect } from 'vitest';
import { 
  validateClientId, 
  validateTokenFormat,
  extractBotIdFromToken 
} from '../src/validator';

describe('validateClientId', () => {
  test('should accept valid Discord snowflake IDs', () => {
    expect(validateClientId('123456789012345678')).toBe(true);  // 18 digits
    expect(validateClientId('1234567890123456789')).toBe(true); // 19 digits
    expect(validateClientId('12345678901234567')).toBe(true);   // 17 digits
  });

  test('should reject invalid IDs', () => {
    expect(validateClientId('')).toBe(false);
    expect(validateClientId('abc')).toBe(false);
    expect(validateClientId('1234567890')).toBe(false);   // Too short
    expect(validateClientId('12345678901234567890')).toBe(false); // Too long
    expect(validateClientId('12345678901234567a')).toBe(false);   // Contains letter
  });
});

describe('validateTokenFormat', () => {
  test('should accept valid token format', () => {
    // Create a fake but properly formatted token
    // Format: base64(botId).timestamp.hmac
    const botId = '123456789012345678';
    const base64BotId = Buffer.from(botId).toString('base64');
    const fakeToken = `${base64BotId}.TIMESTAMP.HMAC_SIGNATURE_HERE_1234567890`;
    
    expect(validateTokenFormat(fakeToken)).toBe(true);
  });

  test('should reject invalid token formats', () => {
    expect(validateTokenFormat('')).toBe(false);
    expect(validateTokenFormat('not-a-token')).toBe(false);
    expect(validateTokenFormat('part1.part2')).toBe(false);  // Only 2 parts
    expect(validateTokenFormat('x.y.z')).toBe(false);        // Invalid base64
    expect(validateTokenFormat(null as any)).toBe(false);
    expect(validateTokenFormat(undefined as any)).toBe(false);
  });

  test('should reject tokens that are too short', () => {
    expect(validateTokenFormat('a.b.c')).toBe(false);
  });
});

describe('extractBotIdFromToken', () => {
  test('should extract valid bot ID from token', () => {
    const botId = '123456789012345678';
    const base64BotId = Buffer.from(botId).toString('base64');
    const token = `${base64BotId}.TIMESTAMP.HMAC`;
    
    expect(extractBotIdFromToken(token)).toBe(botId);
  });

  test('should return null for invalid tokens', () => {
    expect(extractBotIdFromToken('')).toBe(null);
    expect(extractBotIdFromToken('invalid')).toBe(null);
    expect(extractBotIdFromToken('a.b')).toBe(null);
    expect(extractBotIdFromToken('not-base64.b.c')).toBe(null);
  });
});
