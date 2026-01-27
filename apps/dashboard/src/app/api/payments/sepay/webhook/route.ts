import { NextRequest, NextResponse } from 'next/server';
import { prisma, SubscriptionStatus } from '@repo/database';
import crypto from 'crypto';

/**
 * SePay Webhook handler for bank transfer notifications
 * Verifies payment and activates subscription
 * 
 * Webhook format from SePay:
 * {
 *   "id": number,
 *   "gateway": "MBBank",
 *   "transactionDate": "2024-01-15 10:30:00",
 *   "accountNumber": "xxxx1234",
 *   "content": "SYLABOT SYL1234ABC",
 *   "transferType": "in",
 *   "transferAmount": 99000
 * }
 */

interface SepayWebhookPayload {
    id: number;
    gateway: string;
    transactionDate: string;
    accountNumber: string;
    content: string;
    transferType: 'in' | 'out';
    transferAmount: number;
    referenceCode?: string;
}

const PRICING_VND = {
    monthly: { amount: 99000, days: 30 },
    yearly: { amount: 990000, days: 365 },
};

export async function POST(request: NextRequest) {
    try {
        // Verify webhook signature
        const signature = request.headers.get('x-sepay-signature');
        const body = await request.text();

        if (!verifySignature(body, signature)) {
            console.error('Invalid SePay webhook signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const payload: SepayWebhookPayload = JSON.parse(body);

        // Only process incoming transfers
        if (payload.transferType !== 'in') {
            return NextResponse.json({ success: true, message: 'Ignored outgoing transfer' });
        }

        // Extract order ID from content (format: SYLABOT <ORDER_ID>)
        const contentMatch = payload.content?.match(/SYLABOT\s+(\w+)/i);
        if (!contentMatch) {
            console.log('No SylaBot order ID found in transfer content:', payload.content);
            return NextResponse.json({ success: true, message: 'No matching order' });
        }

        // Determine tier based on amount
        let tier: 'monthly' | 'yearly' | null = null;
        if (payload.transferAmount >= PRICING_VND.yearly.amount) {
            tier = 'yearly';
        } else if (payload.transferAmount >= PRICING_VND.monthly.amount) {
            tier = 'monthly';
        } else {
            console.log('Amount too low:', payload.transferAmount);
            return NextResponse.json({ success: false, message: 'Insufficient amount' });
        }

        // Calculate subscription period
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + PRICING_VND[tier].days);

        // For SePay, we need to find the guild from recent activity or logs
        // This is a simplified implementation - in production you'd match orderId to stored orders
        console.log('SePay payment received:', {
            orderId: contentMatch[1],
            amount: payload.transferAmount,
            tier,
            expiresAt,
            transactionDate: payload.transactionDate,
        });

        // Note: In a full implementation, you would:
        // 1. Look up the pending payment by orderId
        // 2. Get the guildId and userId from that record
        // 3. Create/update the subscription

        return NextResponse.json({ success: true, message: 'Payment logged for manual processing' });
    } catch (error) {
        console.error('SePay webhook error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

function verifySignature(body: string, signature: string | null): boolean {
    if (!signature || !process.env.SEPAY_WEBHOOK_SECRET) {
        return process.env.NODE_ENV === 'development'; // Allow in dev
    }

    const expectedSignature = crypto
        .createHmac('sha256', process.env.SEPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}
