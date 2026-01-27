/**
 * Payment configuration for dual provider setup
 * - Stripe: Global payments (USD, EUR, etc.)
 * - SePay: Vietnam banking (VND via bank transfer, VietQR)
 */

export type PaymentProvider = 'stripe' | 'sepay';

export interface PaymentConfig {
    provider: PaymentProvider;
    currency: string;
    region: 'global' | 'vietnam';
}

// Pricing in different currencies
export const PRICING = {
    premium: {
        monthly: {
            usd: 4.99,
            vnd: 99000, // ~$4 VND
        },
        yearly: {
            usd: 49.99,
            vnd: 990000, // ~$40 VND - 17% discount
        },
    },
} as const;

/**
 * Detect user's region and preferred payment method
 */
export function detectPaymentProvider(): PaymentConfig {
    // Check for Vietnamese locale/timezone
    const isVietnam =
        typeof window !== 'undefined' &&
        (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Ho_Chi_Minh' ||
            navigator.language.startsWith('vi'));

    if (isVietnam) {
        return {
            provider: 'sepay',
            currency: 'VND',
            region: 'vietnam',
        };
    }

    return {
        provider: 'stripe',
        currency: 'USD',
        region: 'global',
    };
}

/**
 * Get formatted price for display
 */
export function formatPrice(amount: number, currency: string): string {
    if (currency === 'VND') {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(amount);
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
}

/**
 * Create Stripe checkout session
 */
export async function createStripeSession(
    tier: 'monthly' | 'yearly',
    guildId: string
): Promise<{ url: string } | { error: string }> {
    try {
        const response = await fetch('/api/payments/stripe/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier, guildId }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.error || 'Failed to create checkout session' };
        }

        return { url: data.url };
    } catch (error) {
        return { error: 'Network error. Please try again.' };
    }
}

/**
 * Create SePay payment (VietQR bank transfer)
 */
export async function createSepayPayment(
    tier: 'monthly' | 'yearly',
    guildId: string
): Promise<{ qrCode: string; bankInfo: BankInfo; orderId: string } | { error: string }> {
    try {
        const response = await fetch('/api/payments/sepay/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier, guildId }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.error || 'Failed to create payment' };
        }

        return {
            qrCode: data.qrCode,
            bankInfo: data.bankInfo,
            orderId: data.orderId,
        };
    } catch (error) {
        return { error: 'Network error. Please try again.' };
    }
}

export interface BankInfo {
    bankName: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    content: string; // Transfer content/memo
}
