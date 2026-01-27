'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { Channel } from '@/types/api';

async function fetchGuildChannels(guildId: string): Promise<Channel[]> {
  const res = await fetch(`/api/guilds/${guildId}/channels`);
  if (!res.ok) throw new Error('Failed to fetch channels');
  const json = await res.json();
  return json.data || json.channels || [];
}

export function useGuildChannels(guildId: string | null) {
  return useQuery({
    queryKey: guildId ? queryKeys.guildChannels(guildId) : ['noop'],
    queryFn: () => fetchGuildChannels(guildId!),
    enabled: !!guildId,
    staleTime: 60_000, // 1 min - channels change less frequently
  });
}
