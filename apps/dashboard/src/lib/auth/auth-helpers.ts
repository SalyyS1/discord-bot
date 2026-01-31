/**
 * Auth utilities and helpers
 * Extended with guild access validation
 */

import { auth } from '@/lib/auth';
import { getUserAccessibleGuilds, validateUserGuildAccess } from './guild-access-validator';
import type { Headers } from 'next/dist/compiled/@edge-runtime/primitives';

// Export guild access utilities
export { getUserAccessibleGuilds, validateUserGuildAccess };

// Helper to get session with guild access check
export async function getSessionWithGuildAccess(
  headers: Record<string, string> | Headers,
  guildId?: string
) {
  const session = await auth.api.getSession({
    headers: headers as Record<string, string>,
  });

  if (!session?.user?.id) {
    return { session: null, hasAccess: false };
  }

  if (!guildId) {
    return { session, hasAccess: true };
  }

  const hasAccess = await validateUserGuildAccess(session.user.id, guildId);

  return { session, hasAccess };
}
