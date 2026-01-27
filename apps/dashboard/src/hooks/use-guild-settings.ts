'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { GuildSettings } from '@/types/api';

async function fetchGuildSettings(guildId: string): Promise<GuildSettings> {
  const res = await fetch(`/api/guilds/${guildId}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  const json = await res.json();
  return json.data || json;
}

export function useGuildSettings(guildId: string | null) {
  return useQuery({
    queryKey: guildId ? queryKeys.guildSettings(guildId) : ['noop'],
    queryFn: () => fetchGuildSettings(guildId!),
    enabled: !!guildId,
    staleTime: 30_000, // 30s - balance between freshness and over-fetching
    refetchOnWindowFocus: true,
  });
}
