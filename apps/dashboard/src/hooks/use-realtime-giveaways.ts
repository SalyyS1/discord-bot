'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface Giveaway {
  id: string;
  messageId: string | null;
  channelId: string;
  prize: string;
  description: string | null;
  winnerCount: number;
  entries: number;
  winnersAnnounced: boolean;
  thumbnail: string | null;
  status: 'PENDING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  endsAt: string;
  createdAt: string;
  guildId: string;
}

export interface GiveawayFilters {
  status?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface GiveawaysResponse {
  giveaways: Giveaway[];
  total?: number;
  page?: number;
  totalPages?: number;
  stats?: {
    total: number;
    active: number;
    ended: number;
    totalEntries: number;
  };
}

// ═══════════════════════════════════════════════
// Fetcher
// ═══════════════════════════════════════════════

async function fetchGiveaways(
  guildId: string,
  filters?: GiveawayFilters
): Promise<GiveawaysResponse> {
  const params = new URLSearchParams();

  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.search) params.append('search', filters.search);

  const queryString = params.toString();
  const url = `/api/guilds/${guildId}/giveaways${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch giveaways');
  const { data } = await res.json();
  return data;
}

// ═══════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════

/**
 * Hook for fetching giveaways with automatic polling for near-realtime updates
 * When bot creates giveaway via Discord, it will appear within refetchInterval
 */
export function useRealtimeGiveaways(
  guildId: string | null,
  options?: {
    filters?: GiveawayFilters;
    refetchInterval?: number;
    enabled?: boolean;
  }
) {
  const { filters, refetchInterval = 30000, enabled = true } = options ?? {};

  return useQuery({
    queryKey: guildId
      ? [...queryKeys.guildGiveaways(guildId), filters || {}]
      : ['noop'],
    queryFn: () => fetchGiveaways(guildId as string, filters),
    enabled: !!guildId && enabled,
    staleTime: 10000, // Consider stale after 10 seconds
    refetchInterval, // Poll every 30 seconds by default
    refetchIntervalInBackground: false, // Don't poll when tab is hidden
  });
}

/**
 * Hook to manually trigger giveaway refetch
 * Useful when user performs an action
 */
export function useInvalidateGiveaways() {
  const queryClient = useQueryClient();

  return (guildId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.guildGiveaways(guildId),
    });
  };
}
