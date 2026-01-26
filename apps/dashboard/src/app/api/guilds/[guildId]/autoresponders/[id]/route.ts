import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { publishAutoResponderUpdate } from '@/lib/configSync';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const roleResponseSchema = z.object({
  roleId: z.string(),
  roleName: z.string().optional(),
  response: z.string().max(2000),
});

const userResponseSchema = z.object({
  userId: z.string(),
  username: z.string().optional(),
  response: z.string().max(2000),
});

const autoResponderUpdateSchema = z.object({
  trigger: z.string().min(1).max(100).optional(),
  triggerType: z.enum(['EXACT', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX', 'WILDCARD']).optional(),
  response: z.string().min(1).max(2000).optional(),
  responseType: z.enum(['TEXT', 'EMBED', 'REACTION', 'RANDOM']).optional(),
  cooldownSeconds: z.number().int().min(0).max(3600).optional(),
  enabled: z.boolean().optional(),

  // Advanced features
  mentionUser: z.boolean().optional(),
  deleteOriginal: z.boolean().optional(),
  replyToMessage: z.boolean().optional(),
  dmUser: z.boolean().optional(),

  // Tone & Style
  tone: z.enum(['formal', 'casual', 'friendly', 'playful', 'professional']).optional().nullable(),
  pronoun: z.enum(['neutral', 'first_person', 'third_person']).optional().nullable(),
  emoji: z.boolean().optional(),

  // Role-based responses
  roleResponses: z.array(roleResponseSchema).optional().nullable(),

  // User-specific responses
  userResponses: z.array(userResponseSchema).optional().nullable(),

  // Restrictions
  allowedRoleIds: z.array(z.string()).optional(),
  blockedRoleIds: z.array(z.string()).optional(),
  allowedChannelIds: z.array(z.string()).optional(),
  blockedChannelIds: z.array(z.string()).optional(),
  allowedUserIds: z.array(z.string()).optional(),
  blockedUserIds: z.array(z.string()).optional(),

  // Random responses
  randomResponses: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; id: string }> }
) {
  const { guildId, id } = await params;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  // Rate limiting for mutations
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, 30);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetIn);
  }

  try {
    const body = await request.json();
    const validated = autoResponderUpdateSchema.parse(body);

    // Transform JSON fields to Prisma-compatible format
    const updateData: Record<string, unknown> = { ...validated };
    if ('roleResponses' in updateData) {
      updateData.roleResponses = updateData.roleResponses === null ? null : updateData.roleResponses;
    }
    if ('userResponses' in updateData) {
      updateData.userResponses = updateData.userResponses === null ? null : updateData.userResponses;
    }

    const autoResponder = await prisma.autoResponder.update({
      where: { id, guildId },
      data: updateData as Parameters<typeof prisma.autoResponder.update>[0]['data'],
    });

    // Publish config update for real-time sync
    await publishAutoResponderUpdate(guildId, 'update');

    return ApiResponse.success(autoResponder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(error.errors[0]?.message || 'Validation failed');
    }
    logger.error('Error updating auto-responder', { guildId, id, error: String(error) });
    return ApiResponse.serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; id: string }> }
) {
  const { guildId, id } = await params;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  // Rate limiting for mutations
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, 30);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetIn);
  }

  try {
    await prisma.autoResponder.delete({
      where: { id, guildId },
    });

    // Publish config update for real-time sync
    await publishAutoResponderUpdate(guildId, 'delete');

    return ApiResponse.success({ deleted: true });
  } catch (error) {
    logger.error('Error deleting auto-responder', { guildId, id, error: String(error) });
    return ApiResponse.serverError();
  }
}
