import { NextRequest } from 'next/server';
import { prisma, Prisma } from '@repo/database';
import { z } from 'zod';
import { validateGuildAccess, ensureGuildExists, ApiResponse } from '@/lib/session';
import { createEmptyMessageConfig, type MessageConfig } from '@repo/types';
import { logger } from '@/lib/logger';
import { validateGuildId } from '@/lib/validation';

// Default templates for new guilds
const DEFAULT_TEMPLATES: Record<string, { content: string; embedJson?: object }> = {
  welcome: {
    content: 'Welcome {{user}} to **{{server}}**! You are member #{{memberCount}}.',
    embedJson: {
      color: 0x00ff00,
      title: '👋 Welcome!',
      description: 'Welcome {{user}} to **{{server}}**! You are member #{{memberCount}}.',
      thumbnail: '{{user.avatar}}',
    },
  },
  goodbye: {
    content: '**{{username}}** has left the server. We now have {{memberCount}} members.',
    embedJson: {
      color: 0xff0000,
      title: '👋 Goodbye!',
      description: '**{{username}}** has left the server.',
    },
  },
  levelup: {
    content: '🎉 Congratulations {{user}}! You reached level **{{level}}**!',
    embedJson: {
      color: 0xffd700,
      title: '🎉 Level Up!',
      description: '{{user}} has reached level **{{level}}**!',
    },
  },
  giveaway_start: {
    content:
      '🎉 **GIVEAWAY** 🎉\n\nPrize: **{{prize}}**\nWinners: {{winners}}\nEnds: {{endsAt}}\n\nClick the button below to enter!',
  },
  ticket_open: {
    content:
      'Hello {{user}}, thank you for creating a ticket.\n\nA staff member will be with you shortly.\n\n**Ticket #{{ticket.number}}**',
  },
  ticket_rating: {
    content: 'Thank you for using our support! Please rate your experience (1-5 stars).',
  },
  ticket_review: {
    content:
      '⭐ **New Review** ⭐\n\n{{user}} rated their experience: {{rate.stars}}\n\n> {{rate.text}}',
  },
};

const templateSchema = z.object({
  name: z.string(),
  content: z.string().min(1),
  embedJson: z.any().optional(),
  imageUrl: z.string().url().optional().nullable(),
  enabled: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  // Validate guildId format first
  const guildIdError = validateGuildId(guildId);
  if (guildIdError) return guildIdError;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    // Get all templates for guild
    const templates = await prisma.messageTemplate.findMany({
      where: { guildId },
      orderBy: { name: 'asc' },
    });

    // Merge with defaults for missing templates
    const templateMap = new Map(templates.map((t) => [t.name, t]));
    const allTemplates = Object.keys(DEFAULT_TEMPLATES).map((name) => {
      if (templateMap.has(name)) {
        return templateMap.get(name);
      }
      // Return default template (not yet saved)
      return {
        id: null,
        guildId,
        name,
        content: DEFAULT_TEMPLATES[name].content,
        embedJson: DEFAULT_TEMPLATES[name].embedJson || null,
        imageUrl: null,
        enabled: true,
        isDefault: true,
      };
    });

    return ApiResponse.success(allTemplates);
  } catch (error) {
    logger.error(`Error fetching templates: ${error}`);
    return ApiResponse.serverError();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  // Validate guildId format first
  const guildIdError = validateGuildId(guildId);
  if (guildIdError) return guildIdError;

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    const body = await request.json();
    const validated = templateSchema.parse(body);

    // Ensure guild exists
    await ensureGuildExists(guildId);

    // Build MessageConfig from legacy fields
    const msgConfig: MessageConfig = {
      version: 2,
      content: validated.content,
      embeds: validated.embedJson
        ? [
            {
              ...validated.embedJson,
              fields: validated.embedJson.fields || [],
            },
          ]
        : [],
      components: [],
    };

    // Upsert template
    const template = await prisma.messageTemplate.upsert({
      where: {
        guildId_name: { guildId, name: validated.name },
      },
      update: {
        content: validated.content,
        embedJson: validated.embedJson || Prisma.JsonNull,
        imageUrl: validated.imageUrl || null,
        enabled: validated.enabled ?? true,
        config: msgConfig as unknown as Prisma.InputJsonValue,
      },
      create: {
        guildId,
        name: validated.name,
        content: validated.content,
        embedJson: validated.embedJson || Prisma.JsonNull,
        imageUrl: validated.imageUrl || null,
        enabled: validated.enabled ?? true,
        config: msgConfig as unknown as Prisma.InputJsonValue,
      },
    });

    return ApiResponse.success(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest(error.errors.map((e) => e.message).join(', '));
    }
    logger.error(`Error saving template: ${error}`);
    return ApiResponse.serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return ApiResponse.badRequest('Template name is required');
  }

  // Validate session and guild access
  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    // Delete template (will revert to default)
    await prisma.messageTemplate.deleteMany({
      where: { guildId, name },
    });

    return ApiResponse.success({ deleted: true });
  } catch (error) {
    logger.error(`Error deleting template: ${error}`);
    return ApiResponse.serverError();
  }
}
