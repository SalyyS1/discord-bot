'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Generic settings mutation with optimistic updates
export function useUpdateSettings(guildId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/guilds/${guildId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    // OPTIMISTIC UPDATE: Show new value immediately
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['guild-settings', guildId] });
      const previousSettings = queryClient.getQueryData(['guild-settings', guildId]);
      queryClient.setQueryData(['guild-settings', guildId], (old: Record<string, unknown> | undefined) => ({
        ...old,
        ...newData,
      }));
      return { previousSettings };
    },
    onSuccess: () => {
      toast.success('Settings saved!');
    },
    onError: (_err, _newData, context) => {
      queryClient.setQueryData(['guild-settings', guildId], context?.previousSettings);
      toast.error('Failed to save settings');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['guild-settings', guildId] });
    },
  });
}

// Welcome/Goodbye mutation
export function useUpdateWelcome(guildId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/guilds/${guildId}/welcome`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['guild-settings', guildId] });
      const previousSettings = queryClient.getQueryData(['guild-settings', guildId]);
      queryClient.setQueryData(['guild-settings', guildId], (old: Record<string, unknown> | undefined) => ({
        ...old,
        ...newData,
      }));
      return { previousSettings };
    },
    onSuccess: () => {
      toast.success('Welcome settings saved!');
    },
    onError: (_err, _newData, context) => {
      queryClient.setQueryData(['guild-settings', guildId], context?.previousSettings);
      toast.error('Failed to save settings');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['guild-settings', guildId] });
    },
  });
}

// Leveling mutation
export function useUpdateLeveling(guildId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/guilds/${guildId}/leveling`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['guild-settings', guildId] });
      const previousSettings = queryClient.getQueryData(['guild-settings', guildId]);
      queryClient.setQueryData(['guild-settings', guildId], (old: Record<string, unknown> | undefined) => ({
        ...old,
        ...newData,
      }));
      return { previousSettings };
    },
    onSuccess: () => {
      toast.success('Leveling settings saved!');
    },
    onError: (_err, _newData, context) => {
      queryClient.setQueryData(['guild-settings', guildId], context?.previousSettings);
      toast.error('Failed to save settings');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['guild-settings', guildId] });
    },
  });
}

// Moderation mutation
export function useUpdateModeration(guildId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/guilds/${guildId}/moderation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['guild-settings', guildId] });
      const previousSettings = queryClient.getQueryData(['guild-settings', guildId]);
      queryClient.setQueryData(['guild-settings', guildId], (old: Record<string, unknown> | undefined) => ({
        ...old,
        ...newData,
      }));
      return { previousSettings };
    },
    onSuccess: () => {
      toast.success('Moderation settings saved!');
    },
    onError: (_err, _newData, context) => {
      queryClient.setQueryData(['guild-settings', guildId], context?.previousSettings);
      toast.error('Failed to save settings');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['guild-settings', guildId] });
    },
  });
}

// Tickets mutation
export function useUpdateTickets(guildId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/guilds/${guildId}/tickets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['guild-settings', guildId] });
      const previousSettings = queryClient.getQueryData(['guild-settings', guildId]);
      queryClient.setQueryData(['guild-settings', guildId], (old: Record<string, unknown> | undefined) => ({
        ...old,
        ...newData,
      }));
      return { previousSettings };
    },
    onSuccess: () => {
      toast.success('Ticket settings saved!');
    },
    onError: (_err, _newData, context) => {
      queryClient.setQueryData(['guild-settings', guildId], context?.previousSettings);
      toast.error('Failed to save settings');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['guild-settings', guildId] });
    },
  });
}
