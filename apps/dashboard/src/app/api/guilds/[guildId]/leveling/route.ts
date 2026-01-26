import { NextRequest, NextResponse } from 'next/server';
import { prisma, Prisma } from '@repo/database';
import { z } from 'zod';
import { publishLevelingUpdate } from '@/lib/configSync';
import { validateGuildAccess, ensureGuildExists, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

const levelRoleSchema = z.object({
  level: z.number().int().min(1),
  roleId: z.string().optional().nullable(),
  roleName: z.string().min(1).max(100),
  roleEmoji: z.string().max(10),
  roleColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  autoCreate: z.boolean().default(true),
});

const dailyQuestSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  emoji: z.string().max(10).default('🎯'),
  type: z.enum(['MESSAGE', 'VOICE', 'REACTION', 'FORUM_POST', 'IMAGE_POST', 'CUSTOM']),
  requirement: z.number().int().min(1),
  xpReward: z.number().int().min(0),
  channelId: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
});

const levelingConfigSchema = z.object({
  levelingEnabled: z.boolean().optional(),
  xpMin: z.number().int().min(1).max(100).optional(),
  xpMax: z.number().int().min(1).max(100).optional(),
  xpCooldownSeconds: z.number().int().min(0).max(300).optional(),
  // Voice XP
  voiceXpEnabled: z.boolean().optional(),
  voiceXpPerMinute: z.number().int().min(1).max(50).optional(),
  voiceXpCooldown: z.number().int().min(10).max(300).optional(),
  // XP Exclusions
  noXpChannelIds: z.array(z.string()).optional(),
  noXpRoleIds: z.array(z.string()).optional(),
  // Multipliers (JSON object: { roleId: multiplier })
  xpMultipliers: z.record(z.string(), z.number().min(0.1).max(10)).nullable().optional(),
  // Notifications
  levelUpDmEnabled: z.boolean().optional(),
  levelUpChannelId: z.string().nullable().optional(),
  levelUpMessage: z.string().max(2000).optional(),
  // Formula settings (stored in JSON)
  xpFormula: z.string().optional(),
  baseXp: z.number().int().min(10).max(10000).optional(),
  xpMultiplier: z.number().min(1).max(5).optional(),
  // Level roles
  levelRoles: z.array(levelRoleSchema).optional(),
  // Daily quests
  dailyQuests: z.array(dailyQuestSchema).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    let settings = await prisma.guildSettings.findUnique({
      where: { guildId },
      select: {
        levelingEnabled: true,
        xpMin: true,
        xpMax: true,
        xpCooldownSeconds: true,
        voiceXpEnabled: true,
        voiceXpPerMinute: true,
        voiceXpCooldown: true,
        noXpChannelIds: true,
        noXpRoleIds: true,
        xpMultipliers: true,
        levelUpDmEnabled: true,
        levelUpChannelId: true,
        levelUpMessageConfig: true,
      },
    });

    if (!settings) {
      // Ensure guild exists before creating settings
      await ensureGuildExists(guildId);

      settings = await prisma.guildSettings.create({
        data: { guildId },
        select: {
          levelingEnabled: true,
          xpMin: true,
          xpMax: true,
          xpCooldownSeconds: true,
          voiceXpEnabled: true,
          voiceXpPerMinute: true,
          voiceXpCooldown: true,
          noXpChannelIds: true,
          noXpRoleIds: true,
          xpMultipliers: true,
          levelUpDmEnabled: true,
          levelUpChannelId: true,
          levelUpMessageConfig: true,
        },
      });
    }

    // Fetch level roles
    const levelRoles = await prisma.levelRole.findMany({
      where: { guildId },
      orderBy: { level: 'asc' },
    });

    // Fetch daily quests
    const dailyQuests = await prisma.dailyQuest.findMany({
      where: { guildId },
      orderBy: { createdAt: 'asc' },
    });

    return ApiResponse.success({
      ...settings,
      levelRoles: levelRoles.map(r => ({
        id: r.id,
        level: r.level,
        roleId: r.roleId,
        roleName: r.roleName,
        roleEmoji: r.roleEmoji,
        roleColor: r.roleColor,
        autoCreate: r.autoCreate,
      })),
      dailyQuests: dailyQuests.map(q => ({
        id: q.id,
        name: q.name,
        description: q.description,
        emoji: q.emoji,
        type: q.type,
        requirement: q.requirement,
        xpReward: q.xpReward,
        channelId: q.channelId,
        enabled: q.enabled,
      })),
    });
  } catch (error) {
    logger.error(`Error fetching leveling config: ${error}`);
    return ApiResponse.serverError();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const body = await request.json();
    const validated = levelingConfigSchema.parse(body);

    // Ensure guild exists before upserting settings
    await ensureGuildExists(guildId);

    // Extract level roles and daily quests
    const { levelRoles, dailyQuests, xpMultipliers, ...restSettings } = validated;

    // Transform xpMultipliers: JS null → Prisma.JsonNull for proper DB handling
    const settingsData = {
      ...restSettings,
      ...(xpMultipliers !== undefined && {
        xpMultipliers: xpMultipliers === null ? Prisma.JsonNull : xpMultipliers,
      }),
    };

    // Update settings
    const settings = await prisma.guildSettings.upsert({
      where: { guildId },
      update: settingsData,
      create: {
        guildId,
        ...settingsData,
      },
      select: {
        levelingEnabled: true,
        xpMin: true,
        xpMax: true,
        xpCooldownSeconds: true,
        voiceXpEnabled: true,
        voiceXpPerMinute: true,
        voiceXpCooldown: true,
        noXpChannelIds: true,
        noXpRoleIds: true,
        xpMultipliers: true,
        levelUpDmEnabled: true,
        levelUpChannelId: true,
      },
    });

    // Update level roles if provided
    if (levelRoles) {
      // Delete existing and recreate
      await prisma.levelRole.deleteMany({ where: { guildId } });

      if (levelRoles.length > 0) {
        await prisma.levelRole.createMany({
          data: levelRoles.map(r => ({
            guildId,
            level: r.level,
            roleId: r.roleId,
            roleName: r.roleName,
            roleEmoji: r.roleEmoji,
            roleColor: r.roleColor,
            autoCreate: r.autoCreate,
          })),
        });
      }
    }

    // Update daily quests if provided
    if (dailyQuests) {
      // Delete existing and recreate
      await prisma.dailyQuest.deleteMany({ where: { guildId } });

      if (dailyQuests.length > 0) {
        await prisma.dailyQuest.createMany({
          data: dailyQuests.map(q => ({
            guildId,
            name: q.name,
            description: q.description,
            emoji: q.emoji,
            type: q.type as 'MESSAGE' | 'VOICE' | 'REACTION' | 'FORUM_POST' | 'IMAGE_POST' | 'CUSTOM',
            requirement: q.requirement,
            xpReward: q.xpReward,
            channelId: q.channelId,
            enabled: q.enabled,
          })),
        });
      }
    }

    // Publish config update for real-time sync
    await publishLevelingUpdate(guildId);

    return ApiResponse.success(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    logger.error(`Error updating leveling config: ${error}`);
    return ApiResponse.serverError();
  }
}
