'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useRealtimeSync } from './use-realtime-sync';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface Ticket {
  id: string;
  channelId: string;
  status: 'OPEN' | 'CLAIMED' | 'CLOSED';
  closedAt: string | null;
  createdAt: string;
  member: {
    discordId: string;
  };
}

interface TicketsResponse {
  tickets: Ticket[];
  stats: Record<string, number>;
}

// ═══════════════════════════════════════════════
// Fetcher
// ═══════════════════════════════════════════════

async function fetchTickets(guildId: string): Promise<TicketsResponse> {
  const res = await fetch(`/api/guilds/${guildId}/tickets`);
  if (!res.ok) throw new Error('Failed to fetch tickets');
  const { data } = await res.json();
  return data;
}

// ═══════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════

/**
 * Hook for fetching tickets with automatic polling for near-realtime updates
 * When bot creates ticket via Discord, it will appear within refetchInterval
 * Also listens for Redis events for immediate updates when available
 */
export function useRealtimeTickets(
  guildId: string | null,
  options?: {
    refetchInterval?: number;
    enabled?: boolean;
    token?: string;
  }
) {
  const { refetchInterval = 30000, enabled = true, token } = options ?? {};
  const queryClient = useQueryClient();

  // Listen to ticket events via WebSocket/Redis
  const { lastEvent } = useRealtimeSync({
    guildId: guildId || undefined,
    token,
    enabled: enabled && !!guildId && !!token,
    eventTypes: ['TICKET_CREATE', 'TICKET_CLAIM', 'TICKET_CLOSE'],
  });

  // Invalidate tickets query when ticket event occurs
  useEffect(() => {
    if (!lastEvent || !guildId) return;

    // Only invalidate for ticket events
    if (
      lastEvent.type === 'TICKET_CREATE' ||
      lastEvent.type === 'TICKET_CLAIM' ||
      lastEvent.type === 'TICKET_CLOSE'
    ) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.guildTickets(guildId),
      });
    }
  }, [lastEvent, guildId, queryClient]);

  return useQuery({
    queryKey: guildId ? queryKeys.guildTickets(guildId) : ['noop'],
    queryFn: () => fetchTickets(guildId as string),
    enabled: !!guildId && enabled,
    staleTime: 10000,
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}

/**
 * Hook to manually trigger tickets refetch
 */
export function useInvalidateTickets() {
  const queryClient = useQueryClient();

  return (guildId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.guildTickets(guildId),
    });
  };
}
