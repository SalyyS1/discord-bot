'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';

type ApiEndpoint =
  | 'settings'
  | 'welcome'
  | 'leveling'
  | 'moderation'
  | 'tickets'
  | 'voice'
  | 'music'
  | 'giveaways/settings';

interface MutationConfig {
  endpoint: ApiEndpoint;
  successMessage: string;
  queryKeyFn?: (guildId: string) => readonly unknown[];
}

/**
 * Generic mutation factory for guild settings
 * Uses proper query key namespacing and optimistic updates
 */
function createGuildMutation(guildId: string | null, config: MutationConfig) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!guildId) throw new Error('No guild selected');

      const res = await fetch(`/api/guilds/${guildId}/${config.endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update');
      }

      return res.json();
    },
    onMutate: async (newData) => {
      if (!guildId) return;

      // Use module-specific query key if provided, otherwise fall back to settings
      const queryKey = config.queryKeyFn
        ? config.queryKeyFn(guildId)
        : queryKeys.guildSettings(guildId);

      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: Record<string, unknown> | undefined) => ({
        ...old,
        ...newData,
      }));

      return { previousData, queryKey };
    },
    onSuccess: () => {
      toast.success(config.successMessage);
    },
    onError: (_err, _newData, context) => {
      if (context?.queryKey && context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      toast.error('Failed to save settings');
    },
    onSettled: () => {
      if (guildId) {
        const queryKey = config.queryKeyFn
          ? config.queryKeyFn(guildId)
          : queryKeys.guildSettings(guildId);
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}

// Exported hooks using the factory
export function useUpdateSettings(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'settings',
    successMessage: 'Settings saved!',
  });
}

export function useUpdateWelcome(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'welcome',
    successMessage: 'Welcome settings saved!',
  });
}

export function useUpdateLeveling(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'leveling',
    successMessage: 'Leveling settings saved!',
  });
}

export function useUpdateModeration(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'moderation',
    successMessage: 'Moderation settings saved!',
  });
}

export function useUpdateTickets(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'tickets',
    successMessage: 'Ticket settings saved!',
  });
}

// ═══════════════════════════════════════════════
// NEW Module-Specific Mutation Hooks
// ═══════════════════════════════════════════════

export function useUpdateVoice(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'voice',
    successMessage: 'Voice settings saved!',
    queryKeyFn: queryKeys.guildVoice,
  });
}

export function useUpdateMusic(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'music',
    successMessage: 'Music settings saved!',
    queryKeyFn: queryKeys.guildMusic,
  });
}

export function useUpdateGiveawaySettings(guildId: string | null) {
  return createGuildMutation(guildId, {
    endpoint: 'giveaways/settings',
    successMessage: 'Giveaway settings saved!',
    queryKeyFn: queryKeys.guildGiveawaySettings,
  });
}
