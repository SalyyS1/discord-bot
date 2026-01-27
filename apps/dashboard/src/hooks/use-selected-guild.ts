'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGuildContext } from '@/context/guild-context';

interface Guild {
  id: string;
  name: string;
  icon?: string | null;
}

interface UseSelectedGuildReturn {
  guildId: string | null;
  guild: Guild | null;
  guilds: Guild[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSelectedGuild(): UseSelectedGuildReturn {
  const { selectedGuildId, setSelectedGuildId, isInitialized } = useGuildContext();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuilds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/guilds');
      const data = await res.json();

      if (!data.guilds?.length) {
        setError('No servers found. Make sure the bot is in at least one server.');
        setGuilds([]);
        return;
      }

      setGuilds(data.guilds);

      // Auto-select first guild if none selected
      if (!selectedGuildId && data.guilds.length > 0) {
        setSelectedGuildId(data.guilds[0].id);
      }
    } catch (err) {
      console.error('Failed to load servers:', err);
      setError('Failed to load servers');
    } finally {
      setLoading(false);
    }
  }, [selectedGuildId, setSelectedGuildId]);

  useEffect(() => {
    if (isInitialized) {
      fetchGuilds();
    }
  }, [isInitialized, fetchGuilds]);

  // NOTE: Window event listener removed - proper cache invalidation
  // is now handled in server-selector.tsx via queryClient

  const guild = guilds.find(g => g.id === selectedGuildId) || null;

  return {
    guildId: selectedGuildId,
    guild,
    guilds,
    loading: loading || !isInitialized,
    error,
    refetch: fetchGuilds,
  };
}
