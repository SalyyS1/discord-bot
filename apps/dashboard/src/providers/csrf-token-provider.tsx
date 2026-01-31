'use client';

import { useEffect } from 'react';

/**
 * CSRF Token Provider
 * Fetches CSRF token on mount and sets it as a cookie
 * This ensures all mutating API requests have a valid CSRF token
 */
export function CsrfTokenProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Fetch CSRF token on mount
    const fetchCsrfToken = async () => {
      try {
        await fetch('/api/csrf');
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
    };

    fetchCsrfToken();
  }, []);

  return <>{children}</>;
}
