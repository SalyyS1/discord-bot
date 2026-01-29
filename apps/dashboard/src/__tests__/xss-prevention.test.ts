/**
 * XSS Prevention Test
 * Test that sanitizeForPreview strips malicious code
 */

import { sanitizeForPreview, escapeHtml } from '../lib/sanitize-html-for-preview';

describe('XSS Prevention', () => {
  test('should strip script tags', () => {
    const malicious = '<script>alert(1)</script>Hello';
    const result = sanitizeForPreview(malicious);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  test('should strip img onerror', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const result = sanitizeForPreview(malicious);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  test('should strip iframe', () => {
    const malicious = '<iframe src="javascript:alert(1)"></iframe>';
    const result = sanitizeForPreview(malicious);
    expect(result).not.toContain('iframe');
  });

  test('should preserve Discord markdown', () => {
    const input = '**bold** *italic* __underline__ ~~strikethrough~~';
    const result = sanitizeForPreview(input);
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<u>underline</u>');
    expect(result).toContain('<s>strikethrough</s>');
  });

  test('should replace placeholders safely', () => {
    const input = '{user} joined {server}';
    const result = sanitizeForPreview(input);
    expect(result).toContain('text-blue-400');
    expect(result).not.toContain('{user}');
  });

  test('escapeHtml should escape all HTML entities', () => {
    const input = '<div class="test">Hello & "Goodbye"</div>';
    const result = escapeHtml(input);
    expect(result).toBe('&lt;div class=&quot;test&quot;&gt;Hello &amp; &quot;Goodbye&quot;&lt;/div&gt;');
  });
});
