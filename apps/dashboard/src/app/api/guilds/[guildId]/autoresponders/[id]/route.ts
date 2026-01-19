import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';
import { publishAutoResponderUpdate } from '@/lib/configSync';

const autoResponderUpdateSchema = z.object({
  trigger: z.string().min(1).max(100).optional(),
  triggerType: z.enum(['EXACT', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX']).optional(),
  response: z.string().min(1).max(2000).optional(),
  responseType: z.enum(['TEXT', 'EMBED', 'REACTION']).optional(),
  cooldownSeconds: z.number().int().min(0).max(3600).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; id: string }> }
) {
  const { guildId, id } = await params;

  try {
    const body = await request.json();
    const validated = autoResponderUpdateSchema.parse(body);

    const autoResponder = await prisma.autoResponder.update({
      where: { id, guildId },
      data: validated,
    });

    // Publish config update for real-time sync
    await publishAutoResponderUpdate(guildId, 'update');

    return NextResponse.json({ data: autoResponder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating auto-responder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; id: string }> }
) {
  const { guildId, id } = await params;

  try {
    await prisma.autoResponder.delete({
      where: { id, guildId },
    });

    // Publish config update for real-time sync
    await publishAutoResponderUpdate(guildId, 'delete');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting auto-responder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
