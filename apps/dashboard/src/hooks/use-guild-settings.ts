'use client';

import { useQuery } from '@tanstack/react-query';
import type { GuildSettings } from '@/types/api';

async function fetchGuildSettings(guildId: string): Promise<GuildSettings> {
  const res = await fetch(`/api/guilds/${guildId}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  const json = await res.json();
  return json.data || json;
}

export function useGuildSettings(guildId: string | null) {
  return useQuery({
    queryKey: ['guild-settings', guildId],
    queryFn: () => fetchGuildSettings(guildId!),
    enabled: !!guildId, // Only fetch when guildId exists
    staleTime: 60 * 1000, // 1 minute
  });
}
