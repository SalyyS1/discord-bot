import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { getServerSession } from '@/lib/session';

// SePay API configuration
const BANK_CONFIG = {
    bankName: 'MB Bank',
    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '0123456789',
    accountName: process.env.SEPAY_ACCOUNT_NAME || 'NGUYEN VAN A',
};

const PRICING_VND = {
    monthly: 99000,
    yearly: 990000,
};

/**
 * Generate VietQR URL for bank transfer
 */
function generateVietQR(amount: number, content: string): string {
    const bankId = '970422'; // MB Bank BIN
    return `https://img.vietqr.io/image/${bankId}-${BANK_CONFIG.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tier, guildId } = await request.json();

        if (!tier || !guildId || !['monthly', 'yearly'].includes(tier)) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        const amount = PRICING_VND[tier as keyof typeof PRICING_VND];

        // Generate unique order ID using timestamp + random chars
        const orderId = `SYL${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Transfer content format: SYLABOT <ORDER_ID> <GUILD_ID>
        const content = `SYLABOT ${orderId}`;

        // Generate QR code URL
        const qrCode = generateVietQR(amount, content);

        // Note: In production, you would store this in a database table
        // For now, we return the info and let the webhook handler process incoming payments
        console.log('SePay payment created:', { orderId, guildId, userId: session.user.id, tier, amount });

        return NextResponse.json({
            qrCode,
            bankInfo: {
                ...BANK_CONFIG,
                amount,
                content,
            },
            orderId,
        });
    } catch (error) {
        console.error('SePay payment creation failed:', error);
        return NextResponse.json(
            { error: 'Failed to create payment' },
            { status: 500 }
        );
    }
}
