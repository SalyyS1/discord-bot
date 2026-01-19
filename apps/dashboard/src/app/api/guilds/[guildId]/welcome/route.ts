import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { publishWelcomeUpdate } from '@/lib/configSync';

const welcomeConfigSchema = z.object({
  welcomeChannelId: z.string().optional().nullable(),
  welcomeMessage: z.string().max(2000).optional().nullable(),
  welcomeImageEnabled: z.boolean().optional(),
  goodbyeChannelId: z.string().optional().nullable(),
  goodbyeMessage: z.string().max(2000).optional().nullable(),
  goodbyeImageEnabled: z.boolean().optional(),
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
        welcomeChannelId: true,
        welcomeMessage: true,
        welcomeImageEnabled: true,
        goodbyeChannelId: true,
        goodbyeMessage: true,
        goodbyeImageEnabled: true,
      },
    });

    if (!settings) {
      // Create default settings
      settings = await prisma.guildSettings.create({
        data: { guildId },
        select: {
          welcomeChannelId: true,
          welcomeMessage: true,
          welcomeImageEnabled: true,
          goodbyeChannelId: true,
          goodbyeMessage: true,
          goodbyeImageEnabled: true,
        },
      });
    }

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error('Error fetching welcome config:', error);
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
    const validated = welcomeConfigSchema.parse(body);

    const settings = await prisma.guildSettings.upsert({
      where: { guildId },
      update: validated,
      create: {
        guildId,
        ...validated,
      },
      select: {
        welcomeChannelId: true,
        welcomeMessage: true,
        welcomeImageEnabled: true,
        goodbyeChannelId: true,
        goodbyeMessage: true,
        goodbyeImageEnabled: true,
      },
    });

    // Publish config update for real-time sync
    await publishWelcomeUpdate(guildId);

    return NextResponse.json({ data: settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating welcome config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
