/**
 * Request Context Utilities
 * Provides requestId generation and extraction for API routes
 */

import { generateRequestId, getClientIp, sanitizeUserAgent } from '@repo/config';

export { generateRequestId, getClientIp, sanitizeUserAgent };

/**
 * Request context for audit logging
 */
export interface RequestContext {
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Extract request context from Next.js request
 */
export function getRequestContext(request: Request): RequestContext {
  const headers = request.headers;

  // Check for existing request ID (from middleware or upstream proxy)
  const existingId = headers.get('x-request-id');
  const requestId = existingId || generateRequestId();

  return {
    requestId,
    ipAddress: getClientIp(headers),
    userAgent: sanitizeUserAgent(headers.get('user-agent')),
  };
}

/**
 * Add request ID to response headers
 */
export function withRequestId<T extends Response>(
  response: T,
  requestId: string
): T {
  response.headers.set('x-request-id', requestId);
  return response;
}
