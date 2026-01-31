'use client';

import { createContext, useContext, useMemo } from 'react';
import { useGuildContext } from './guild-context';
import { useGuildChannels } from '@/hooks/use-guild-channels';
import { useGuildRoles, type Role } from '@/hooks/use-guild-roles';
import type { Channel } from '@/types/api';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface GuildDataContextType {
  channels: Channel[];
  roles: Role[];
  categories: Channel[];
  textChannels: Channel[];
  voiceChannels: Channel[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetchChannels: () => void;
  refetchRoles: () => void;
}

// ═══════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════

const GuildDataContext = createContext<GuildDataContextType | null>(null);

// ═══════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════

export function GuildDataProvider({ children }: { children: React.ReactNode }) {
  const { selectedGuildId } = useGuildContext();

  const channelsQuery = useGuildChannels(selectedGuildId);
  const rolesQuery = useGuildRoles(selectedGuildId);

  const value = useMemo(() => {
    const channels = channelsQuery.data ?? [];
    return {
      channels,
      roles: rolesQuery.data ?? [],
      categories: channels.filter((c) => c.type === 'category'),
      textChannels: channels.filter((c) => c.type === 'text'),
      voiceChannels: channels.filter((c) => c.type === 'voice'),
      isLoading: channelsQuery.isLoading || rolesQuery.isLoading,
      isError: channelsQuery.isError || rolesQuery.isError,
      error: channelsQuery.error || rolesQuery.error,
      refetchChannels: () => channelsQuery.refetch(),
      refetchRoles: () => rolesQuery.refetch(),
    };
  }, [channelsQuery, rolesQuery]);

  return (
    <GuildDataContext.Provider value={value}>
      {children}
    </GuildDataContext.Provider>
  );
}

// ═══════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════

/**
 * Hook to access guild data - throws if used outside provider
 */
export function useGuildData() {
  const context = useContext(GuildDataContext);
  if (!context) {
    throw new Error('useGuildData must be used within GuildDataProvider');
  }
  return context;
}

/**
 * Optional hook that doesn't throw - for components that may be used outside provider
 */
export function useGuildDataOptional() {
  return useContext(GuildDataContext);
}
