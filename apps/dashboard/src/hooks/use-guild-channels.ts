'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { Channel } from '@/types/api';

/**
 * API response type for channels endpoint
 */
interface ChannelApiResponse {
  success: boolean;
  data?: Channel[];
  error?: string;
  code?: string;
}

/**
 * Extended error with status and code properties
 */
interface ApiError extends Error {
  status?: number;
  code?: string;
}

/**
 * Fetch channels for a guild with proper error handling
 */
async function fetchGuildChannels(guildId: string): Promise<Channel[]> {
  const res = await fetch(`/api/guilds/${guildId}/channels`);
  const json: ChannelApiResponse = await res.json();

  if (!res.ok || !json.success) {
    const error: ApiError = new Error(json.error || 'Failed to fetch channels');
    error.code = json.code;
    error.status = res.status;
    throw error;
  }

  return json.data || [];
}

/**
 * Hook to fetch guild channels with smart retry logic.
 * - Retries on transient errors (network, 500)
 * - Does NOT retry on permanent errors (403, 503)
 */
export function useGuildChannels(guildId: string | null) {
  return useQuery({
    queryKey: guildId ? queryKeys.guildChannels(guildId) : ['noop'],
    queryFn: () => fetchGuildChannels(guildId!),
    enabled: !!guildId,
    staleTime: 60_000, // 1 min - channels change less frequently
    retry: (failureCount, error) => {
      const apiError = error as ApiError;
      // Don't retry on 403 (bot not in guild) or 503 (no token)
      if (apiError.status === 403 || apiError.status === 503) {
        return false;
      }
      // Retry transient errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}
