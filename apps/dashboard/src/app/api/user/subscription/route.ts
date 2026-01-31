import { NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { getServerSession } from '@/lib/session';
import { logger } from '@/lib/logger';

// Admin Discord IDs
const ADMIN_DISCORD_IDS = ['784728722459983874'];

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's Discord account to check admin status
        const account = await prisma.account.findFirst({
            where: { userId: session.user.id, providerId: 'discord' },
            select: { accountId: true },
        });

        const isAdmin = account && ADMIN_DISCORD_IDS.includes(account.accountId);

        // Get or create user subscription
        let subscription = await prisma.userSubscription.findUnique({
            where: { userId: session.user.id },
        });

        // Create default FREE subscription if none exists
        if (!subscription) {
            subscription = await prisma.userSubscription.create({
                data: {
                    userId: session.user.id,
                    tier: 'FREE',
                },
            });
        }

        // Check if subscription expired
        const isExpired = subscription.expiresAt && new Date() > subscription.expiresAt;
        const effectiveTier = isExpired ? 'FREE' : subscription.tier;

        return NextResponse.json({
            success: true,
            data: {
                tier: effectiveTier,
                expiresAt: subscription.expiresAt,
                isExpired,
                isAdmin,
            },
        });
    } catch (error) {
        logger.error(`Failed to get subscription: ${error}`);
        return NextResponse.json(
            { success: false, error: 'Failed to get subscription' },
            { status: 500 }
        );
    }
}
