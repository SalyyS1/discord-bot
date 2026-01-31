/**
 * Category-based Settings API
 * PATCH /api/guilds/[guildId]/settings/[category]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import {
  validateSettingsUpdate,
  isValidCategory,
  extractCategoryFields,
  createAuditLogger,
  generateRequestId,
  getClientIp,
  sanitizeUserAgent,
  ConfigPublisher,
} from '@repo/config';
import { validateGuildAccess, getServerSession, ApiResponse } from '@/lib/session';
import { getRequestContext } from '@/lib/request-context';
import Redis from 'ioredis';
import { logger } from '@/lib/logger';

// Redis for cache invalidation and pub/sub
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const configPublisher = new ConfigPublisher(redis);
const auditLog = createAuditLogger(prisma);

type RouteParams = { params: Promise<{ guildId: string; category: string }> };

/**
 * GET - Fetch settings for a specific category
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { guildId, category } = await params;

  // Validate category
  if (!isValidCategory(category)) {
    return ApiResponse.badRequest(`Invalid settings category: ${category}`);
  }

  // Validate guild access
  const accessError = await validateGuildAccess(guildId);
  if (accessError) return accessError;

  // Get settings
  const settings = await prisma.guildSettings.findUnique({
    where: { guildId },
  });

  // Extract only the requested category fields
  const categoryData = extractCategoryFields(category, settings);

  return ApiResponse.success(categoryData);
}

/**
 * PATCH - Update settings for a specific category
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { guildId, category } = await params;
  const ctx = getRequestContext(request);

  // Validate category
  if (!isValidCategory(category)) {
    return ApiResponse.badRequest(`Invalid settings category: ${category}`);
  }

  // Validate guild access
  const accessError = await validateGuildAccess(guildId);
  if (accessError) return accessError;

  // Get session for audit
  const session = await getServerSession();
  if (!session) return ApiResponse.unauthorized();

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return ApiResponse.badRequest('Invalid JSON body');
  }

  // Validate against schema
  const validation = validateSettingsUpdate(category, body);
  if (!validation.valid) {
    return ApiResponse.badRequest(validation.errors?.join(', ') || 'Validation failed');
  }

  // Get current settings for audit log (before state)
  const currentSettings = await prisma.guildSettings.findUnique({
    where: { guildId },
  });
  const beforeState = extractCategoryFields(category, currentSettings);

  // Ensure guild exists before upserting settings
  await prisma.guild.upsert({
    where: { id: guildId },
    create: { id: guildId, name: 'Unknown' },
    update: {},
  });

  // Update settings (upsert to handle new guilds)
  const updatedSettings = await prisma.guildSettings.upsert({
    where: { guildId },
    update: validation.data as Record<string, unknown>,
    create: {
      guildId,
      ...(validation.data as Record<string, unknown>),
    },
  });

  // Invalidate cache and notify bot
  try {
    // Map category to module for pub/sub
    type ConfigModule = 'SETTINGS' | 'WELCOME' | 'MODERATION' | 'LEVELING' | 'TICKETS' | 'GIVEAWAY' | 'TEMPVOICE';
    const moduleMap: Record<string, ConfigModule> = {
      welcome: 'WELCOME',
      goodbye: 'WELCOME',
      leveling: 'LEVELING',
      voiceXp: 'LEVELING',
      antiSpam: 'MODERATION',
      antiLink: 'MODERATION',
      wordFilter: 'MODERATION',
      mentionSpam: 'MODERATION',
      tickets: 'TICKETS',
      giveaway: 'GIVEAWAY',
      tempVoice: 'TEMPVOICE',
    };

    const module = moduleMap[category] || 'SETTINGS';
    await configPublisher.publish(guildId, module);
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
      action: 'SETTINGS_UPDATE',
      category: 'SETTINGS',
      target: category,
      before: beforeState,
      after: validation.data,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  } catch (error) {
    logger.warn(`Failed to write audit log: ${error}`);
  }

  // Return updated category fields
  const responseData = extractCategoryFields(category, updatedSettings);

  return NextResponse.json(
    { success: true, data: responseData },
    {
      headers: {
        'x-request-id': ctx.requestId,
      },
    }
  );
}
