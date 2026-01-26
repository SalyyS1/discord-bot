import { NextRequest } from 'next/server';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { getGuildRoles } from '@/lib/discord-oauth';
import { logger } from '@/lib/logger';

// GET - Get guild roles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const roles = await getGuildRoles(guildId);

    // Filter out @everyone and managed roles, sort by position
    const filteredRoles = roles
      .filter((role: { name: string; managed: boolean }) => role.name !== '@everyone' && !role.managed)
      .sort((a: { position: number }, b: { position: number }) => b.position - a.position)
      .map((role: { id: string; name: string; color: number; position: number }) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
      }));

    return ApiResponse.success(filteredRoles);
  } catch (error) {
    logger.error(`Failed to fetch roles: ${error}`);
    return ApiResponse.serverError();
  }
}
