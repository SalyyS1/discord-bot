'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data considered fresh for 1 minute
            staleTime: 60 * 1000,
            // Cache kept for 5 minutes after unmount
            gcTime: 5 * 60 * 1000,
            // Don't refetch on window focus (annoying for dashboards)
            refetchOnWindowFocus: false,
            // Retry once on failure
            retry: 1,
            // Retry delay
            retryDelay: 1000,
          },
          mutations: {
            // Retry mutations once
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
