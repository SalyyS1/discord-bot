# Phase 4: Frontend Error Handling

## Context

- [Phase 1](./phase-1-fix-403-token-cascade.md) - Backend now returns 401 for token issues
- [Phase 3](./phase-3-error-improvements.md) - Error codes available

## Overview

| Field    | Value       |
| -------- | ----------- |
| Date     | 2026-01-28  |
| Priority | P2 - Medium |
| Status   | Pending     |
| Effort   | 1h          |

**Validated Decision:** Auto-redirect after 2s delay on 401 errors (Option A confirmed).

**Problem**: Frontend shows generic "Failed to fetch" errors, doesn't guide users.

**Solution**: Error boundaries, user-friendly messages, automatic re-auth redirect.

## Requirements

- [ ] Error boundary catches React errors
- [ ] API errors show actionable messages
- [ ] 401 triggers re-auth redirect
- [ ] Loading and error states in data fetching

## Implementation Steps

### Step 4.1: Create Error Boundary Component

**File**: `apps/dashboard/src/components/error-boundary.tsx` (new file)

```tsx
'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Error boundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button variant="outline" onClick={() => this.setState({ hasError: false })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

### Step 4.2: Create API Error Handler Hook

**File**: `apps/dashboard/src/hooks/use-api-error.ts` (new file)

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';

interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export function useApiError() {
  const router = useRouter();

  const handleError = useCallback(
    (error: ApiErrorResponse | Error, context?: string) => {
      // Handle API response errors
      if ('code' in error && typeof error.code === 'string') {
        switch (error.code) {
          case 'SESSION_EXPIRED':
          case 'TOKEN_REVOKED':
          case 'UNAUTHORIZED':
            toast.error('Session expired', {
              description: 'Please sign in again.',
              action: {
                label: 'Sign In',
                onClick: () => router.push('/api/auth/signin'),
              },
            });
            // Redirect after short delay
            setTimeout(() => router.push('/api/auth/signin'), 2000);
            return;

          case 'FORBIDDEN':
            toast.error('Access denied', {
              description: error.error || 'You do not have permission.',
            });
            return;

          case 'NOT_FOUND':
            toast.error('Not found', {
              description: error.error,
            });
            return;

          case 'RATE_LIMITED':
            toast.warning('Slow down', {
              description: 'Too many requests. Please wait a moment.',
            });
            return;

          case 'SERVICE_UNAVAILABLE':
          case 'DATABASE_ERROR':
          case 'DISCORD_API_ERROR':
            toast.error('Temporarily unavailable', {
              description: 'Please try again in a moment.',
              action: {
                label: 'Retry',
                onClick: () => window.location.reload(),
              },
            });
            return;
        }
      }

      // Generic error
      toast.error(context || 'Error', {
        description: 'message' in error ? error.message : error.error,
      });
    },
    [router]
  );

  return { handleError };
}
```

### Step 4.3: Create Fetch Wrapper with Error Handling

**File**: `apps/dashboard/src/lib/api-client.ts` (new file)

```typescript
'use client';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: ApiResponse<never> | null }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const json = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !json.success) {
      return {
        data: null,
        error: {
          success: false,
          error: json.error || 'Request failed',
          code: json.code,
        },
      };
    }

    return { data: json.data || null, error: null };
  } catch (error) {
    return {
      data: null,
      error: {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR',
      },
    };
  }
}
```

### Step 4.4: Update Data Fetching Components

**Example pattern for guild data hooks**:

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiError } from '@/hooks/use-api-error';
import { apiFetch } from '@/lib/api-client';

export function useGuildStats(guildId: string) {
  const { handleError } = useApiError();

  return useQuery({
    queryKey: ['guild', guildId, 'stats'],
    queryFn: async () => {
      const { data, error } = await apiFetch<GuildStats>(`/api/guilds/${guildId}/stats`);

      if (error) {
        handleError(error, 'Failed to load guild stats');
        throw new Error(error.error);
      }

      return data;
    },
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error.message.includes('Session expired')) return false;
      return failureCount < 2;
    },
  });
}
```

### Step 4.5: Add Error Boundary to Layout

**File**: `apps/dashboard/src/app/(dashboard)/guilds/[guildId]/layout.tsx`

```tsx
import { ErrorBoundary } from '@/components/error-boundary';

export default function GuildLayout({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
```

## Success Criteria

- [ ] React errors don't crash entire page
- [ ] 401 errors redirect to sign-in with message
- [ ] Users see clear, actionable error messages
- [ ] Network errors prompt retry action
- [ ] No generic "Failed to fetch" messages

## Risk Assessment

| Risk                    | Mitigation                         |
| ----------------------- | ---------------------------------- |
| Over-notifying users    | Dedupe toasts, rate limit          |
| Auth redirect loops     | Check current path before redirect |
| Lost context on refresh | Store intended destination         |
