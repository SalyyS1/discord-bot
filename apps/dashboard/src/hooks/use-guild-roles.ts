'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

/**
 * Role type definition
 */
export interface Role {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions?: string;
  managed?: boolean;
  mentionable?: boolean;
}

/**
 * API response type for roles endpoint
 */
interface RoleApiResponse {
  success: boolean;
  data?: Role[];
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
 * Fetch roles for a guild with proper error handling
 */
async function fetchGuildRoles(guildId: string): Promise<Role[]> {
  const res = await fetch(`/api/guilds/${guildId}/roles`);
  const json: RoleApiResponse = await res.json();

  if (!res.ok || !json.success) {
    const error: ApiError = new Error(json.error || 'Failed to fetch roles');
    error.code = json.code;
    error.status = res.status;
    throw error;
  }

  return json.data || [];
}

/**
 * Hook to fetch guild roles with smart retry logic.
 * - Retries on transient errors (network, 500)
 * - Does NOT retry on permanent errors (403, 503)
 */
export function useGuildRoles(guildId: string | null) {
  return useQuery({
    queryKey: guildId ? queryKeys.guildRoles(guildId) : ['noop'],
    queryFn: () => fetchGuildRoles(guildId!),
    enabled: !!guildId,
    staleTime: 5 * 60_000, // 5 minutes - roles change rarely
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

/**
 * Hook to get a filtered list of assignable roles (excludes @everyone and managed roles)
 */
export function useAssignableRoles(guildId: string | null) {
  const query = useGuildRoles(guildId);

  return {
    ...query,
    data: query.data?.filter((role) => role.name !== '@everyone' && !role.managed) ?? [],
  };
}
