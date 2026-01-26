import { NextRequest } from 'next/server';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { z } from 'zod';
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

const createSchema = z.object({
  trigger: z.string().min(1).max(200),
  triggerType: z.enum(['EXACT', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX', 'WILDCARD']),
  response: z.string().min(1).max(2000),
  responseType: z.enum(['TEXT', 'EMBED', 'REACTION', 'RANDOM']),
  cooldownSeconds: z.number().min(0).max(3600).default(0),
  enabled: z.boolean().default(true),

  // Advanced features
  mentionUser: z.boolean().optional().default(false),
  deleteOriginal: z.boolean().optional().default(false),
  replyToMessage: z.boolean().optional().default(true),
  dmUser: z.boolean().optional().default(false),

  // Tone & Style
  tone: z.enum(['formal', 'casual', 'friendly', 'playful', 'professional']).optional(),
  pronoun: z.enum(['neutral', 'first_person', 'third_person']).optional(),
  emoji: z.boolean().optional(),

  // Role-based responses
  roleResponses: z.array(roleResponseSchema).optional(),

  // User-specific responses
  userResponses: z.array(userResponseSchema).optional(),

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  const responders = await prisma.autoResponder.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
  });

  return ApiResponse.success(responders);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const json = await request.json();
    const result = createSchema.safeParse(json);

    if (!result.success) {
      return ApiResponse.badRequest(result.error.message);
    }

    const responder = await prisma.autoResponder.create({
      data: {
        guildId,
        trigger: result.data.trigger,
        triggerType: result.data.triggerType,
        response: result.data.response,
        responseType: result.data.responseType,
        cooldownSeconds: result.data.cooldownSeconds,
        enabled: result.data.enabled,
        mentionUser: result.data.mentionUser,
        deleteOriginal: result.data.deleteOriginal,
        replyToMessage: result.data.replyToMessage,
        dmUser: result.data.dmUser,
        tone: result.data.tone,
        pronoun: result.data.pronoun,
        emoji: result.data.emoji,
        roleResponses: result.data.roleResponses,
        userResponses: result.data.userResponses,
        allowedRoleIds: result.data.allowedRoleIds || [],
        blockedRoleIds: result.data.blockedRoleIds || [],
        allowedChannelIds: result.data.allowedChannelIds || [],
        blockedChannelIds: result.data.blockedChannelIds || [],
        allowedUserIds: result.data.allowedUserIds || [],
        blockedUserIds: result.data.blockedUserIds || [],
        randomResponses: result.data.randomResponses || [],
      },
    });

    return ApiResponse.created(responder);
  } catch (error) {
    logger.error(`Create Responder Error: ${error}`);
    return ApiResponse.serverError();
  }
}
