# Phase 3: Error Handling Improvements

## Context

- [Phase 1](./phase-1-fix-403-token-cascade.md)
- [Phase 2](./phase-2-fix-500-errors.md)

## Overview

| Field    | Value      |
| -------- | ---------- |
| Date     | 2026-01-28 |
| Priority | P1 - High  |
| Status   | Pending    |
| Effort   | 1h         |

**Problem**: Generic error handling loses context, makes debugging hard.

**Solution**: Structured error types, consistent logging, centralized error utilities.

## Requirements

- [ ] Structured error types for common scenarios
- [ ] Consistent error logging with full context
- [ ] Error response helper with error codes

## Implementation Steps

### Step 3.1: Create Error Types

**File**: `apps/dashboard/src/lib/errors.ts` (new file)

```typescript
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

  internal: (message = 'Internal server error'): ApiError => ({
    code: 'INTERNAL_ERROR',
    message,
    status: 500,
  }),
} as const;

/**
 * Convert ApiError to NextResponse
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
```

### Step 3.2: Update Logger for Structured Errors

**File**: `apps/dashboard/src/lib/logger.ts`

```typescript
// Add helper for API error logging
export function logApiError(
  route: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const errorInfo = {
    route,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : String(error),
    ...context,
    timestamp: new Date().toISOString(),
  };

  logger.error(`API Error in ${route}`, errorInfo);
}
```

### Step 3.3: Update Session with Error Types

**File**: `apps/dashboard/src/lib/session.ts`

```typescript
// Add import
import { Errors, errorResponse } from './errors';

// Update ApiResponse to use structured errors
export const ApiResponse = {
  // ... existing methods ...

  // Add structured error method
  apiError: (error: ApiError) => errorResponse(error),
};
```

### Step 3.4: Update Route Error Handling Pattern

**Example update for any route**:

```typescript
import { Errors, errorResponse } from '@/lib/errors';
import { logApiError } from '@/lib/logger';

export async function GET(request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  try {
    // ... route logic
  } catch (error) {
    logApiError('/api/guilds/[guildId]/route', error, { guildId });

    // Distinguish error types
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return errorResponse(Errors.database('query'));
    }

    return errorResponse(Errors.internal());
  }
}
```

## Success Criteria

- [ ] All API errors include error code
- [ ] Logs contain full error context (stack, params)
- [ ] Frontend can switch on error codes
- [ ] Consistent error format across all routes

## Risk Assessment

| Risk                             | Mitigation                            |
| -------------------------------- | ------------------------------------- |
| Breaking existing error handling | Gradual rollout, backward compatible  |
| Exposing internal details        | Only include safe details in response |
