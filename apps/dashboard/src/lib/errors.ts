/**
 * Structured API error types
 */

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'SESSION_EXPIRED'
  | 'TOKEN_REVOKED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'DISCORD_API_ERROR'
  | 'ENCRYPTION_ERROR'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

export const Errors = {
  unauthorized: (message = 'Unauthorized'): ApiError => ({
    code: 'UNAUTHORIZED',
    message,
    status: 401,
  }),

  sessionExpired: (): ApiError => ({
    code: 'SESSION_EXPIRED',
    message: 'Session expired. Please sign in again.',
    status: 401,
  }),

  tokenRevoked: (): ApiError => ({
    code: 'TOKEN_REVOKED',
    message: 'Discord access revoked. Please re-link your account.',
    status: 401,
  }),

  forbidden: (message = 'Access denied'): ApiError => ({
    code: 'FORBIDDEN',
    message,
    status: 403,
  }),

  notFound: (resource = 'Resource'): ApiError => ({
    code: 'NOT_FOUND',
    message: `${resource} not found`,
    status: 404,
  }),

  validation: (message: string, details?: Record<string, unknown>): ApiError => ({
    code: 'VALIDATION_ERROR',
    message,
    status: 400,
    details,
  }),

  database: (operation: string): ApiError => ({
    code: 'DATABASE_ERROR',
    message: 'Database temporarily unavailable',
    status: 503,
    details: { operation },
  }),

  discord: (operation: string): ApiError => ({
    code: 'DISCORD_API_ERROR',
    message: 'Discord API temporarily unavailable',
    status: 503,
    details: { operation },
  }),

  rateLimit: (retryAfter?: number): ApiError => ({
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please slow down.',
    status: 429,
    details: retryAfter ? { retryAfter } : undefined,
  }),

  serviceUnavailable: (service: string): ApiError => ({
    code: 'SERVICE_UNAVAILABLE',
    message: `${service} is temporarily unavailable`,
    status: 503,
    details: { service },
  }),

  internal: (message = 'Internal server error'): ApiError => ({
    code: 'INTERNAL_ERROR',
    message,
    status: 500,
  }),
} as const;

/**
 * Convert ApiError to Response
 */
export function errorResponse(error: ApiError): Response {
  return Response.json(
    {
      success: false,
      error: error.message,
      code: error.code,
      ...(error.details && { details: error.details }),
    },
    { status: error.status }
  );
}
