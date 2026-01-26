import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { getServerSession } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { code } = body;

        if (!code || typeof code !== 'string') {
            return NextResponse.json({ success: false, error: 'Invalid code' }, { status: 400 });
        }

        // Find the upgrade code
        const upgradeCode = await prisma.upgradeCode.findUnique({
            where: { code: code.toUpperCase().trim() },
        });

        if (!upgradeCode) {
            return NextResponse.json({ success: false, error: 'Invalid code' }, { status: 404 });
        }

        if (upgradeCode.usedBy) {
            return NextResponse.json({ success: false, error: 'Code already used' }, { status: 400 });
        }

        // Calculate new expiration date
        const now = new Date();
        const newExpiresAt = new Date(now.getTime() + upgradeCode.durationDays * 24 * 60 * 60 * 1000);

        // Get current subscription
        const currentSub = await prisma.userSubscription.findUnique({
            where: { userId: session.user.id },
        });

        // If user already has premium and it hasn't expired, extend from current expiration
        let expiresAt = newExpiresAt;
        if (currentSub?.tier === 'PREMIUM' && currentSub.expiresAt && currentSub.expiresAt > now) {
            expiresAt = new Date(currentSub.expiresAt.getTime() + upgradeCode.durationDays * 24 * 60 * 60 * 1000);
        }

        // Update or create subscription
        await prisma.userSubscription.upsert({
            where: { userId: session.user.id },
            create: {
                userId: session.user.id,
                tier: upgradeCode.tier,
                expiresAt,
            },
            update: {
                tier: upgradeCode.tier,
                expiresAt,
            },
        });

        // Mark code as used
        await prisma.upgradeCode.update({
            where: { id: upgradeCode.id },
            data: {
                usedBy: session.user.id,
                usedAt: now,
            },
        });

        logger.info('[Redeem] Code redeemed', {
            userId: session.user.id,
            code: code,
            tier: upgradeCode.tier,
            durationDays: upgradeCode.durationDays,
            expiresAt,
        });

        return NextResponse.json({
            success: true,
            data: {
                tier: upgradeCode.tier,
                durationDays: upgradeCode.durationDays,
                expiresAt,
            },
        });
    } catch (error) {
        logger.error(`Failed to redeem code: ${error}`);
        return NextResponse.json(
            { success: false, error: 'Failed to redeem code' },
            { status: 500 }
        );
    }
}
