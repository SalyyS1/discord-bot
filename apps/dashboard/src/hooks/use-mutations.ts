'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';

type ApiEndpoint = 'settings' | 'welcome' | 'leveling' | 'moderation' | 'tickets';

interface MutationConfig {
  endpoint: ApiEndpoint;
  successMessage: string;
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
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onMutate: async (newData) => {
      if (!guildId) return;

      const queryKey = queryKeys.guildSettings(guildId);
      await queryClient.cancelQueries({ queryKey });

      const previousSettings = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: Record<string, unknown> | undefined) => ({
        ...old,
        ...newData,
      }));

      return { previousSettings };
    },
    onSuccess: () => {
      toast.success(config.successMessage);
    },
    onError: (_err, _newData, context) => {
      if (guildId && context?.previousSettings) {
        queryClient.setQueryData(queryKeys.guildSettings(guildId), context.previousSettings);
      }
      toast.error('Failed to save settings');
    },
    onSettled: () => {
      if (guildId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.guildSettings(guildId) });
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
