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
              description: 'Redirecting to sign in...',
              action: {
                label: 'Sign In Now',
                onClick: () => router.push('/api/auth/signin'),
              },
            });
            // Auto-redirect after 2s delay (validated decision)
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

          case 'VALIDATION_ERROR':
            toast.error('Invalid input', {
              description: error.error,
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
