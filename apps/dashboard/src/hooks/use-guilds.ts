'use client';

import { useQuery } from '@tanstack/react-query';
import type { Guild } from '@/types/api';

async function fetchGuilds(): Promise<Guild[]> {
  const res = await fetch('/api/guilds');
  if (!res.ok) throw new Error('Failed to fetch guilds');
  const data = await res.json();
  return data.guilds || [];
}

export function useGuilds() {
  return useQuery({
    queryKey: ['guilds'],
    queryFn: fetchGuilds,
    staleTime: 5 * 60 * 1000, // 5 minutes - guilds rarely change
  });
}
