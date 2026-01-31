/**
 * Settings Export API
 * GET /api/guilds/[guildId]/settings/export
 */

import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { createAuditLogger } from '@repo/config';
import { validateGuildAccess, getServerSession, ApiResponse } from '@/lib/session';
import { getRequestContext } from '@/lib/request-context';
import { logger } from '@/lib/logger';

const auditLog = createAuditLogger(prisma);

type RouteParams = { params: Promise<{ guildId: string }> };

// Fields to exclude from export (sensitive/internal)
const EXCLUDED_FIELDS = ['guildId', 'createdAt', 'updatedAt'];

/**
 * GET - Export all settings for a guild
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params;
  const ctx = getRequestContext(request);

  // Validate guild access
  const accessError = await validateGuildAccess(guildId);
  if (accessError) return accessError;

  // Get session for audit
  const session = await getServerSession();
  if (!session) return ApiResponse.unauthorized();

  // Get settings with guild info
  const settings = await prisma.guildSettings.findUnique({
    where: { guildId },
    include: {
      guild: { select: { name: true } },
    },
  });

  if (!settings) {
    return ApiResponse.notFound('Guild settings');
  }

  // Build exportable object (remove sensitive/internal fields)
  const exportable: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (!EXCLUDED_FIELDS.includes(key) && key !== 'guild') {
      exportable[key] = value;
    }
  }

  const exportData = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    guildName: settings.guild?.name || 'Unknown',
    settings: exportable,
  };

  // Audit log
  try {
    await auditLog({
      guildId,
      userId: session.user.id,
      requestId: ctx.requestId,
      source: 'DASHBOARD',
      action: 'SETTINGS_EXPORT',
      category: 'SETTINGS',
      target: 'all',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  } catch (error) {
    logger.warn(`Failed to write audit log: ${error}`);
  }

  // Return as downloadable JSON file
  const fileName = `settings-${guildId}-${Date.now()}.json`;

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'x-request-id': ctx.requestId,
    },
  });
}
