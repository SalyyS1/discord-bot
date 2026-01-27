'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * User preferences type
 */
export interface UserPreferences {
  ticketNotifications: boolean;
  securityAlerts: boolean;
  botUpdates: boolean;
  timezone: string;
}

/**
 * Default preferences for new users
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  ticketNotifications: true,
  securityAlerts: true,
  botUpdates: false,
  timezone: 'utc',
};

/**
 * Query key for user preferences
 */
export const preferencesKey = ['user', 'preferences'] as const;

/**
 * Fetch user preferences from API
 */
async function fetchUserPreferences(): Promise<UserPreferences> {
  const res = await fetch('/api/user/preferences');
  if (!res.ok) {
    // Return defaults if user has no preferences yet
    if (res.status === 404) {
      return DEFAULT_PREFERENCES;
    }
    throw new Error('Failed to fetch preferences');
  }
  const json = await res.json();
  return json.data ?? DEFAULT_PREFERENCES;
}

/**
 * Hook to fetch user preferences
 */
export function useUserPreferences() {
  return useQuery({
    queryKey: preferencesKey,
    queryFn: fetchUserPreferences,
    staleTime: 5 * 60_000, // 5 minutes
    placeholderData: DEFAULT_PREFERENCES,
  });
}

/**
 * Hook to update user preferences with optimistic updates
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<UserPreferences>) => {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update preferences');
      return res.json();
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: preferencesKey });

      // Snapshot current value
      const previous = queryClient.getQueryData<UserPreferences>(preferencesKey);

      // Optimistically update
      queryClient.setQueryData<UserPreferences>(preferencesKey, (old) => ({
        ...(old ?? DEFAULT_PREFERENCES),
        ...newData,
      }));

      return { previous };
    },
    onError: (_err, _newData, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(preferencesKey, context.previous);
      }
    },
    onSettled: () => {
      // Refetch after mutation settles
      queryClient.invalidateQueries({ queryKey: preferencesKey });
    },
  });
}
