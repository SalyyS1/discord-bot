'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

/**
 * Role type definition
 */
export interface Role {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
}

/**
 * Fetch roles for a guild
 */
async function fetchGuildRoles(guildId: string): Promise<Role[]> {
  const res = await fetch(`/api/guilds/${guildId}/roles`);
  if (!res.ok) throw new Error('Failed to fetch roles');
  const json = await res.json();
  return json.data || json.roles || [];
}

/**
 * Hook to fetch guild roles
 * Roles change rarely, so we use a longer stale time
 */
export function useGuildRoles(guildId: string | null) {
  return useQuery({
    queryKey: guildId ? queryKeys.guildRoles(guildId) : ['noop'],
    queryFn: () => fetchGuildRoles(guildId!),
    enabled: !!guildId,
    staleTime: 5 * 60_000, // 5 minutes - roles change rarely
  });
}

/**
 * Hook to get a filtered list of assignable roles (excludes @everyone and managed roles)
 */
export function useAssignableRoles(guildId: string | null) {
  const query = useGuildRoles(guildId);

  return {
    ...query,
    data: query.data?.filter((role) => role.name !== '@everyone' && !role.managed) ?? [],
  };
}
