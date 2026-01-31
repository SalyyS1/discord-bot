import { NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { logger } from '@/lib/logger';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    try {
        // Get data for the last 7 days
        const now = new Date();
        const days: { date: string; members: number; messages: number }[] = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            // Get members who were active before this date
            const memberCount = await prisma.member.count({
                where: {
                    guildId,
                    createdAt: { lt: nextDate },
                },
            });

            // Get messages from this day (approximated from totalMessages changes)
            // Since we don't track daily messages, use the current total as an approximation
            const messagesQuery = await prisma.member.aggregate({
                where: {
                    guildId,
                    lastXpGain: {
                        gte: date,
                        lt: nextDate,
                    },
                },
                _count: true,
            });

            days.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                members: memberCount,
                messages: messagesQuery._count * 10, // Approximate messages per active member
            });
        }

        return NextResponse.json({ success: true, data: days });
    } catch (error) {
        logger.error(`Failed to fetch chart data: ${error}`);
        return NextResponse.json({ success: false, data: [] });
    }
}
