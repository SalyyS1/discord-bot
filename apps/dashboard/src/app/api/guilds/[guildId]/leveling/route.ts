import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { publishLevelingUpdate } from '@/lib/configSync';

const levelingConfigSchema = z.object({
  levelingEnabled: z.boolean().optional(),
  xpMin: z.number().int().min(1).max(100).optional(),
  xpMax: z.number().int().min(1).max(100).optional(),
  xpCooldownSeconds: z.number().int().min(10).max(300).optional(),
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
        levelingEnabled: true,
        xpMin: true,
        xpMax: true,
        xpCooldownSeconds: true,
      },
    });

    if (!settings) {
      settings = await prisma.guildSettings.create({
        data: { guildId },
        select: {
          levelingEnabled: true,
          xpMin: true,
          xpMax: true,
          xpCooldownSeconds: true,
        },
      });
    }

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error('Error fetching leveling config:', error);
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
    const validated = levelingConfigSchema.parse(body);

    const settings = await prisma.guildSettings.upsert({
      where: { guildId },
      update: validated,
      create: {
        guildId,
        ...validated,
      },
      select: {
        levelingEnabled: true,
        xpMin: true,
        xpMax: true,
        xpCooldownSeconds: true,
      },
    });

    // Publish config update for real-time sync
    await publishLevelingUpdate(guildId);

    return NextResponse.json({ data: settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating leveling config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
