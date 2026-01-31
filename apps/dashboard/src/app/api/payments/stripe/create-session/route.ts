import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';

// Force dynamic to skip pre-rendering at build time
export const dynamic = 'force-dynamic';

const PRICE_IDS = {
    monthly: process.env.STRIPE_PRICE_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_YEARLY || '',
};

export async function POST(request: NextRequest) {
    try {
        // Check if Stripe is configured
        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json(
                { error: 'Payment is not configured' },
                { status: 503 }
            );
        }

        const session = await getServerSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tier, guildId } = await request.json();

        if (!tier || !guildId || !['monthly', 'yearly'].includes(tier)) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        // Dynamic import to avoid build errors
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2025-12-15.clover',
        });

        // Create Stripe checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: PRICE_IDS[tier as keyof typeof PRICE_IDS],
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success&guild=${guildId}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?payment=cancelled`,
            metadata: {
                userId: session.user.id,
                guildId,
                tier,
            },
            customer_email: session.user.email || undefined,
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error('Stripe session creation failed:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
