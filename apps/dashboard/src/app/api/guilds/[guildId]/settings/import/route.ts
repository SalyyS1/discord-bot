/**
 * Settings Import API
 * POST /api/guilds/[guildId]/settings/import
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import {
  SETTINGS_CATEGORIES,
  validateSettingsUpdate,
  createAuditLogger,
  ConfigPublisher,
} from '@repo/config';
import { validateGuildAccess, getServerSession, ApiResponse } from '@/lib/session';
import { getRequestContext } from '@/lib/request-context';
import Redis from 'ioredis';
import { logger } from '@/lib/logger';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const configPublisher = new ConfigPublisher(redis);
const auditLog = createAuditLogger(prisma);

type RouteParams = { params: Promise<{ guildId: string }> };

// Fields that should not be imported
const IMPORT_BLOCKED_FIELDS = ['guildId', 'createdAt', 'updatedAt'];

interface ImportPayload {
  version: string;
  exportedAt?: string;
  guildName?: string;
  settings: Record<string, unknown>;
}

/**
 * POST - Import settings from exported JSON
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params;
  const ctx = getRequestContext(request);

  // Validate guild access
  const accessError = await validateGuildAccess(guildId);
  if (accessError) return accessError;

  // Get session for audit
  const session = await getServerSession();
  if (!session) return ApiResponse.unauthorized();

  // Parse request body
  let body: ImportPayload;
  try {
    body = await request.json();
  } catch {
    return ApiResponse.badRequest('Invalid JSON body');
  }

  // Validate import format
  if (!body.version || !body.settings) {
    return ApiResponse.badRequest('Invalid import format: missing version or settings');
  }

  // Check version compatibility
  if (!body.version.startsWith('2.')) {
    return ApiResponse.badRequest(
      `Incompatible settings version: ${body.version}. Expected 2.x`
    );
  }

  // Remove blocked fields from import
  const cleanSettings: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body.settings)) {
    if (!IMPORT_BLOCKED_FIELDS.includes(key)) {
      cleanSettings[key] = value;
    }
  }

  // Validate settings by category
  const errors: string[] = [];
  const validatedData: Record<string, unknown> = {};

  for (const [category, schema] of Object.entries(SETTINGS_CATEGORIES)) {
    // Extract fields that belong to this category from cleanSettings
    const categoryFields: Record<string, unknown> = {};
    let hasFieldsForCategory = false;

    for (const key of Object.keys(cleanSettings)) {
      // Check if this field starts with category prefix or matches category patterns
      if (key.toLowerCase().includes(category.toLowerCase()) || isFieldInCategory(key, category)) {
        categoryFields[key] = cleanSettings[key];
        hasFieldsForCategory = true;
      }
    }

    if (hasFieldsForCategory) {
      const result = schema.safeParse(categoryFields);
      if (!result.success) {
        errors.push(
          ...result.error.errors.map(
            (e) => `${category}.${e.path.join('.')}: ${e.message}`
          )
        );
      } else {
        Object.assign(validatedData, result.data);
      }
    }
  }

  // Also include any fields that passed individual validation
  for (const [key, value] of Object.entries(cleanSettings)) {
    if (!(key in validatedData)) {
      validatedData[key] = value;
    }
  }

  if (errors.length > 0) {
    return ApiResponse.badRequest(`Validation errors: ${errors.slice(0, 5).join('; ')}`);
  }

  // Get current settings for audit (before state)
  const beforeSettings = await prisma.guildSettings.findUnique({
    where: { guildId },
  });

  // Ensure guild exists
  await prisma.guild.upsert({
    where: { id: guildId },
    create: { id: guildId, name: body.guildName || 'Unknown' },
    update: {},
  });

  // Apply settings
  const updatedSettings = await prisma.guildSettings.upsert({
    where: { guildId },
    update: validatedData,
    create: { guildId, ...validatedData },
  });

  // Notify bot of settings change
  try {
    await configPublisher.publish(guildId, 'SETTINGS');
  } catch (error) {
    logger.warn(`Failed to publish config update: ${error}`);
  }

  // Audit log
  try {
    await auditLog({
      guildId,
      userId: session.user.id,
      requestId: ctx.requestId,
      source: 'DASHBOARD',
      action: 'SETTINGS_IMPORT',
      category: 'SETTINGS',
      target: 'all',
      before: beforeSettings ? { fieldsCount: Object.keys(beforeSettings).length } : null,
      after: {
        importedFrom: body.guildName,
        version: body.version,
        fieldsCount: Object.keys(validatedData).length,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  } catch (error) {
    logger.warn(`Failed to write audit log: ${error}`);
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        imported: true,
        fieldsImported: Object.keys(validatedData).length,
      },
    },
    {
      headers: {
        'x-request-id': ctx.requestId,
      },
    }
  );
}

/**
 * Helper to check if a field belongs to a category
 */
function isFieldInCategory(field: string, category: string): boolean {
  const categoryPrefixes: Record<string, string[]> = {
    core: ['timezone', 'locale', 'logChannelId', 'modLogChannelId', 'muteRoleId'],
    antiSpam: ['antiSpam'],
    antiLink: ['antiLink'],
    wordFilter: ['wordFilter', 'filteredWords'],
    mentionSpam: ['mentionSpam'],
    welcome: ['welcome'],
    goodbye: ['goodbye'],
    autoRole: ['autoRole'],
    verification: ['verification', 'verifiedRoleId'],
    leveling: ['leveling', 'xp', 'noXp', 'levelUp'],
    voiceXp: ['voiceXp'],
    suggestions: ['suggestions'],
    tickets: ['ticket'],
    giveaway: ['giveaway'],
    tempVoice: ['tempVoice'],
    utility: ['autoResponder', 'stickyMessages'],
    rating: ['rating'],
  };

  const prefixes = categoryPrefixes[category] || [];
  return prefixes.some((prefix) =>
    field.toLowerCase().startsWith(prefix.toLowerCase())
  );
}
