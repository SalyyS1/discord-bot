/**
 * Templates API
 * GET /api/guilds/[guildId]/templates - List templates
 * POST /api/guilds/[guildId]/templates - Create new template
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateGuildAccess, getServerSession, ApiResponse } from '@/lib/session';
import { getRequestContext } from '@/lib/request-context';
import { listTemplates, saveDraft } from '@/lib/templates';
import { createAuditLogger } from '@repo/config';
import { prisma } from '@repo/database';
import { logger } from '@/lib/logger';

const auditLog = createAuditLogger(prisma);

type RouteParams = { params: Promise<{ guildId: string }> };

// Schema for creating templates
const createTemplateSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z_]+$/, 'Name must be lowercase with underscores'),
  displayName: z.string().max(100).optional(),
  config: z.object({
    version: z.literal(2),
    content: z.string().max(2000).optional(),
    embeds: z.array(z.any()).max(10).default([]),
    components: z.array(z.any()).max(5).default([]),
  }),
});

/**
 * GET - List all templates for a guild
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params;

  // Validate guild access
  const accessError = await validateGuildAccess(guildId);
  if (accessError) return accessError;

  const templates = await listTemplates(guildId);

  return ApiResponse.success(templates);
}

/**
 * POST - Create a new template
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params;
  const ctx = getRequestContext(request);

  // Validate guild access
  const accessError = await validateGuildAccess(guildId);
  if (accessError) return accessError;

  const session = await getServerSession();
  if (!session) return ApiResponse.unauthorized();

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return ApiResponse.badRequest('Invalid JSON body');
  }

  // Validate
  const result = createTemplateSchema.safeParse(body);
  if (!result.success) {
    return ApiResponse.badRequest(result.error.errors.map(e => e.message).join(', '));
  }

  const { name, displayName, config } = result.data;

  // Check if template already exists
  const existing = await prisma.messageTemplate.findUnique({
    where: { guildId_name: { guildId, name } },
  });
  if (existing) {
    return ApiResponse.badRequest(`Template "${name}" already exists`);
  }

  // Create template
  const template = await saveDraft(guildId, name, config, displayName);

  // Audit log
  try {
    await auditLog({
      guildId,
      userId: session.user.id,
      requestId: ctx.requestId,
      source: 'DASHBOARD',
      action: 'SETTINGS_UPDATE',
      category: 'SETTINGS',
      target: `template:${name}`,
      after: { name, displayName },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  } catch (error) {
    logger.warn(`Audit log failed: ${error}`);
  }

  return ApiResponse.created(template);
}
