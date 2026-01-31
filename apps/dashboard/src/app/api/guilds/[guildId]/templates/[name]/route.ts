/**
 * Individual Template API
 * GET /api/guilds/[guildId]/templates/[name] - Get template
 * PATCH /api/guilds/[guildId]/templates/[name] - Update template draft
 * DELETE /api/guilds/[guildId]/templates/[name] - Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateGuildAccess, getServerSession, ApiResponse } from '@/lib/session';
import { getRequestContext } from '@/lib/request-context';
import {
  getTemplate,
  saveDraft,
  publishTemplate,
  rollbackTemplate,
  archiveTemplate,
  restoreTemplate,
  deleteTemplate,
  copyTemplate,
} from '@/lib/templates';
import { createAuditLogger, validateMessageConfig } from '@repo/config';
import { prisma } from '@repo/database';
import { logger } from '@/lib/logger';

const auditLog = createAuditLogger(prisma);

type RouteParams = { params: Promise<{ guildId: string; name: string }> };

// Schema for updating templates
const updateTemplateSchema = z.object({
  displayName: z.string().max(100).optional(),
  config: z.object({
    version: z.literal(2),
    content: z.string().max(2000).optional(),
    embeds: z.array(z.any()).max(10).default([]),
    components: z.array(z.any()).max(5).default([]),
  }).optional(),
  action: z.enum(['save', 'publish', 'rollback', 'archive', 'restore', 'copy']).optional(),
  targetVersion: z.number().int().positive().optional(), // For rollback
  copyToName: z.string().min(1).max(50).regex(/^[a-z_]+$/).optional(), // For copy
});

/**
 * GET - Get a template with versions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { guildId, name } = await params;

  // Validate guild access
  const accessError = await validateGuildAccess(guildId);
  if (accessError) return accessError;

  const template = await getTemplate(guildId, name);
  if (!template) {
    return ApiResponse.notFound('Template');
  }

  return ApiResponse.success(template);
}

/**
 * PATCH - Update template or perform lifecycle action
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { guildId, name } = await params;
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
  const result = updateTemplateSchema.safeParse(body);
  if (!result.success) {
    return ApiResponse.badRequest(result.error.errors.map(e => e.message).join(', '));
  }

  const { displayName, config, action, targetVersion, copyToName } = result.data;
  let template;

  try {
    switch (action) {
      case 'publish':
        template = await publishTemplate(guildId, name, session.user.id);
        break;

      case 'rollback':
        if (!targetVersion) {
          return ApiResponse.badRequest('targetVersion required for rollback');
        }
        template = await rollbackTemplate(guildId, name, targetVersion);
        break;

      case 'archive':
        template = await archiveTemplate(guildId, name);
        break;

      case 'restore':
        template = await restoreTemplate(guildId, name);
        break;

      case 'copy':
        if (!copyToName) {
          return ApiResponse.badRequest('copyToName required for copy');
        }
        template = await copyTemplate(guildId, name, copyToName);
        break;

      case 'save':
      default:
        if (!config) {
          return ApiResponse.badRequest('config required for save');
        }
        // Validate MessageConfig limits
        const validationErrors = validateMessageConfig(config);
        if (validationErrors.length > 0) {
          return ApiResponse.badRequest(
            validationErrors.map(e => `${e.path}: ${e.message}`).join(', ')
          );
        }
        template = await saveDraft(guildId, name, config, displayName);
        break;
    }
  } catch (error) {
    if (error instanceof Error) {
      return ApiResponse.badRequest(error.message);
    }
    throw error;
  }

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
      after: { action: action || 'save', version: template.version },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  } catch (error) {
    logger.warn(`Audit log failed: ${error}`);
  }

  return ApiResponse.success(template);
}

/**
 * DELETE - Delete a template
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { guildId, name } = await params;
  const ctx = getRequestContext(request);

  // Validate guild access
  const accessError = await validateGuildAccess(guildId);
  if (accessError) return accessError;

  const session = await getServerSession();
  if (!session) return ApiResponse.unauthorized();

  // Check if template exists
  const existing = await getTemplate(guildId, name);
  if (!existing) {
    return ApiResponse.notFound('Template');
  }

  await deleteTemplate(guildId, name);

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
      before: { name, version: existing.version },
      after: null,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  } catch (error) {
    logger.warn(`Audit log failed: ${error}`);
  }

  return NextResponse.json(
    { success: true, message: 'Template deleted' },
    { headers: { 'x-request-id': ctx.requestId } }
  );
}
