import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';

const guildSettingsSchema = z.object({
  logChannelId: z.string().optional().nullable(),
  modLogChannelId: z.string().optional().nullable(),
  muteRoleId: z.string().optional().nullable(),
  autoRoleIds: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    const guild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        settings: true,
      },
    });

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    return NextResponse.json({ data: guild });
  } catch (error) {
    console.error('Error fetching guild:', error);
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
    const validated = guildSettingsSchema.parse(body);

    const settings = await prisma.guildSettings.upsert({
      where: { guildId },
      update: validated,
      create: {
        guildId,
        ...validated,
      },
    });

    return NextResponse.json({ data: settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating guild settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
