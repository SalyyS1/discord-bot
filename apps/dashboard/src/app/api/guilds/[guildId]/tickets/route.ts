import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { z } from 'zod';

const ticketSettingsSchema = z.object({
  ticketCategoryId: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    if (type === 'settings') {
      // Get ticket settings from GuildSettings
      const settings = await prisma.guildSettings.findUnique({
        where: { guildId },
        select: { ticketCategoryId: true },
      });
      return NextResponse.json({ data: settings || { ticketCategoryId: null } });
    }

    // Get tickets list
    const tickets = await prisma.ticket.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ data: tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
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
    const validated = ticketSettingsSchema.parse(body);

    const settings = await prisma.guildSettings.upsert({
      where: { guildId },
      update: validated,
      create: {
        guildId,
        ...validated,
      },
      select: { ticketCategoryId: true },
    });

    return NextResponse.json({ data: settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating ticket settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
