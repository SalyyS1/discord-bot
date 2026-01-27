'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * AutoResponder type definition
 */
export interface AutoResponder {
  id: string;
  trigger: string;
  triggerType: 'EXACT' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX' | 'WILDCARD';
  response: string;
  responseType: 'TEXT' | 'EMBED' | 'REACTION' | 'RANDOM';
  cooldownSeconds: number;
  enabled: boolean;
  mentionUser?: boolean;
  deleteOriginal?: boolean;
  replyToMessage?: boolean;
  dmUser?: boolean;
  tone?: 'formal' | 'casual' | 'friendly' | 'playful' | 'professional';
  pronoun?: 'neutral' | 'first_person' | 'third_person';
  emoji?: boolean;
  roleResponses?: { roleId: string; roleName?: string; response: string }[];
  userResponses?: { userId: string; username?: string; response: string }[];
  allowedRoleIds?: string[];
  blockedRoleIds?: string[];
  allowedChannelIds?: string[];
  blockedChannelIds?: string[];
  allowedUserIds?: string[];
  blockedUserIds?: string[];
  randomResponses?: string[];
  usageCount?: number;
  lastUsedAt?: string;
  createdAt?: string;
}

export type CreateAutoResponderInput = Omit<
  AutoResponder,
  'id' | 'usageCount' | 'lastUsedAt' | 'createdAt'
>;
export type UpdateAutoResponderInput = Partial<CreateAutoResponderInput>;

/**
 * Query key factory for autoresponders
 */
export const autoresponderKeys = {
  all: ['autoresponders'] as const,
  list: (guildId: string) => ['autoresponders', guildId] as const,
  detail: (guildId: string, id: string) => ['autoresponders', guildId, id] as const,
};

/**
 * Fetch autoresponders for a guild
 */
async function fetchAutoResponders(guildId: string): Promise<AutoResponder[]> {
  const res = await fetch(`/api/guilds/${guildId}/autoresponders`);
  if (!res.ok) throw new Error('Failed to fetch autoresponders');
  const json = await res.json();
  return json.data || [];
}

/**
 * Hook to fetch autoresponders for a guild
 */
export function useAutoResponders(guildId: string | null) {
  return useQuery({
    queryKey: guildId ? autoresponderKeys.list(guildId) : ['noop'],
    queryFn: () => fetchAutoResponders(guildId!),
    enabled: !!guildId,
    staleTime: 30_000, // 30 seconds
    placeholderData: [], // Immediate render with empty array
  });
}

/**
 * Hook to create a new autoresponder
 */
export function useCreateAutoResponder(guildId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAutoResponderInput) => {
      const res = await fetch(`/api/guilds/${guildId}/autoresponders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create autoresponder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: autoresponderKeys.list(guildId) });
    },
  });
}

/**
 * Hook to update an autoresponder
 */
export function useUpdateAutoResponder(guildId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAutoResponderInput }) => {
      const res = await fetch(`/api/guilds/${guildId}/autoresponders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update autoresponder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: autoresponderKeys.list(guildId) });
    },
  });
}

/**
 * Hook to delete an autoresponder
 */
export function useDeleteAutoResponder(guildId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/guilds/${guildId}/autoresponders/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete autoresponder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: autoresponderKeys.list(guildId) });
    },
  });
}

/**
 * Hook to toggle an autoresponder's enabled state
 */
export function useToggleAutoResponder(guildId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/guilds/${guildId}/autoresponders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed to toggle autoresponder');
      return res.json();
    },
    onMutate: async ({ id, enabled }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: autoresponderKeys.list(guildId) });
      const previous = queryClient.getQueryData<AutoResponder[]>(autoresponderKeys.list(guildId));

      if (previous) {
        queryClient.setQueryData<AutoResponder[]>(
          autoresponderKeys.list(guildId),
          previous.map((r) => (r.id === id ? { ...r, enabled } : r))
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(autoresponderKeys.list(guildId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: autoresponderKeys.list(guildId) });
    },
  });
}
