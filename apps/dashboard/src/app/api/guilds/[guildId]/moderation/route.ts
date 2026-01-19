import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { publishModerationUpdate } from '@/lib/configSync';

const moderationConfigSchema = z.object({
  antiSpamEnabled: z.boolean().optional(),
  antiLinkEnabled: z.boolean().optional(),
  antiLinkWhitelist: z.array(z.string()).optional(),
  muteRoleId: z.string().optional().nullable(),
  modLogChannelId: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    let settings = await prisma.guildSettings.findUnique({
      where: { guildId },
      select: {
        antiSpamEnabled: true,
        antiLinkEnabled: true,
        antiLinkWhitelist: true,
        muteRoleId: true,
        modLogChannelId: true,
      },
    });

    if (!settings) {
      settings = await prisma.guildSettings.create({
        data: { guildId },
        select: {
          antiSpamEnabled: true,
          antiLinkEnabled: true,
          antiLinkWhitelist: true,
          muteRoleId: true,
          modLogChannelId: true,
        },
      });
    }

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error('Error fetching moderation config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    const body = await request.json();
    const validated = moderationConfigSchema.parse(body);

    const settings = await prisma.guildSettings.upsert({
      where: { guildId },
      update: validated,
      create: {
        guildId,
        ...validated,
      },
      select: {
        antiSpamEnabled: true,
        antiLinkEnabled: true,
        antiLinkWhitelist: true,
        muteRoleId: true,
        modLogChannelId: true,
      },
    });

    // Publish config update for real-time sync
    await publishModerationUpdate(guildId);

    return NextResponse.json({ data: settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating moderation config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
