import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { publishAutoResponderUpdate } from '@/lib/configSync';

const autoResponderSchema = z.object({
  trigger: z.string().min(1).max(100),
  triggerType: z.enum(['EXACT', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX']),
  response: z.string().min(1).max(2000),
  responseType: z.enum(['TEXT', 'EMBED', 'REACTION']),
  cooldownSeconds: z.number().int().min(0).max(3600).optional(),
  enabled: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    const autoResponders = await prisma.autoResponder.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: autoResponders });
  } catch (error) {
    console.error('Error fetching auto-responders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    const body = await request.json();
    const validated = autoResponderSchema.parse(body);

    const autoResponder = await prisma.autoResponder.create({
      data: {
        guildId,
        ...validated,
      },
    });

    // Publish config update for real-time sync
    await publishAutoResponderUpdate(guildId, 'create');

    return NextResponse.json({ data: autoResponder }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error creating auto-responder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
