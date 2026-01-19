import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { publishTempVoiceUpdate } from '@/lib/configSync';

const tempVoiceConfigSchema = z.object({
  creatorChannelId: z.string().min(1),
  categoryId: z.string().min(1),
  defaultName: z.string().max(100).optional(),
  defaultLimit: z.number().int().min(0).max(99).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    const config = await prisma.tempVoiceConfig.findUnique({
      where: { guildId },
    });

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error('Error fetching temp voice config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    const body = await request.json();
    const validated = tempVoiceConfigSchema.parse(body);

    const config = await prisma.tempVoiceConfig.upsert({
      where: { guildId },
      update: validated,
      create: {
        guildId,
        ...validated,
      },
    });

    // Publish config update for real-time sync
    await publishTempVoiceUpdate(guildId, 'update');

    return NextResponse.json({ data: config });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating temp voice config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    await prisma.tempVoiceConfig.delete({
      where: { guildId },
    });

    // Publish config update for real-time sync
    await publishTempVoiceUpdate(guildId, 'delete');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting temp voice config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
