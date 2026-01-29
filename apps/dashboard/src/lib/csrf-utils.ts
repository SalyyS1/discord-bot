/**
 * CSRF Token Utilities
 *
 * Token Lifecycle:
 * - Generated: On session creation (login)
 * - Stored: HttpOnly, Secure, SameSite=Strict cookie
 * - Validated: On every mutating request (POST/PUT/DELETE)
 *
 * Rotation Strategy:
 * - Tokens rotate automatically on session refresh
 * - Session refresh triggered by better-auth on token renewal
 * - Manual rotation: call generateCsrfToken() on password change
 *
 * Security Properties:
 * - __Host- prefix: Bound to origin, requires Secure, no Path/Domain
 * - 32 bytes entropy: Resistant to brute force
 * - Not in localStorage: XSS cannot exfiltrate
 */

import { randomBytes } from 'crypto';

const CSRF_COOKIE_NAME = '__Host-csrf';

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Get CSRF token from cookie (client-side)
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? match[1] : null;
}
