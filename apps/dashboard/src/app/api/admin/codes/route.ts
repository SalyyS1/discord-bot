import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { getServerSession } from '@/lib/session';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Admin Discord IDs
const ADMIN_DISCORD_IDS = ['784728722459983874'];

// Generate random code
function generateCode(): string {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
}

// Verify admin access
async function verifyAdmin(userId: string): Promise<boolean> {
    const account = await prisma.account.findFirst({
        where: { userId, providerId: 'discord' },
        select: { accountId: true },
    });
    return account ? ADMIN_DISCORD_IDS.includes(account.accountId) : false;
}

// GET - List all codes (admin only)
export async function GET() {
    try {
        const session = await getServerSession();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await verifyAdmin(session.user.id))) {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const codes = await prisma.upgradeCode.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        return NextResponse.json({ success: true, data: codes });
    } catch (error) {
        logger.error(`Failed to list codes: ${error}`);
        return NextResponse.json({ success: false, error: 'Failed to list codes' }, { status: 500 });
    }
}

// POST - Create new code (admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await verifyAdmin(session.user.id))) {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { tier = 'PREMIUM', durationDays = 30, count = 1 } = body;

        if (!['FREE', 'PREMIUM'].includes(tier)) {
            return NextResponse.json({ success: false, error: 'Invalid tier' }, { status: 400 });
        }

        if (durationDays < 1 || durationDays > 365) {
            return NextResponse.json({ success: false, error: 'Duration must be 1-365 days' }, { status: 400 });
        }

        if (count < 1 || count > 100) {
            return NextResponse.json({ success: false, error: 'Count must be 1-100' }, { status: 400 });
        }

        // Generate codes
        const codes = [];
        for (let i = 0; i < count; i++) {
            const code = await prisma.upgradeCode.create({
                data: {
                    code: generateCode(),
                    tier,
                    durationDays,
                    createdBy: session.user.id,
                },
            });
            codes.push(code);
        }

        logger.info('[Admin] Created upgrade codes', {
            adminId: session.user.id,
            tier,
            durationDays,
            count: codes.length,
        });

        return NextResponse.json({ success: true, data: codes });
    } catch (error) {
        logger.error(`Failed to create codes: ${error}`);
        return NextResponse.json({ success: false, error: 'Failed to create codes' }, { status: 500 });
    }
}

// DELETE - Delete unused code (admin only)
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (!(await verifyAdmin(session.user.id))) {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const codeId = searchParams.get('id');

        if (!codeId) {
            return NextResponse.json({ success: false, error: 'Code ID required' }, { status: 400 });
        }

        const code = await prisma.upgradeCode.findUnique({ where: { id: codeId } });
        if (!code) {
            return NextResponse.json({ success: false, error: 'Code not found' }, { status: 404 });
        }

        if (code.usedBy) {
            return NextResponse.json({ success: false, error: 'Cannot delete used code' }, { status: 400 });
        }

        await prisma.upgradeCode.delete({ where: { id: codeId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error(`Failed to delete code: ${error}`);
        return NextResponse.json({ success: false, error: 'Failed to delete code' }, { status: 500 });
    }
}
