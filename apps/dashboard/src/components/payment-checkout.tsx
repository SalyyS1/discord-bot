'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Building2, QrCode, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    detectPaymentProvider,
    formatPrice,
    PRICING,
    createStripeSession,
    createSepayPayment,
    type PaymentProvider,
    type BankInfo,
} from '@/lib/payments';
import { useAnalytics } from '@/lib/analytics';
import { useGuildContext } from '@/context/guild-context';

interface PaymentCheckoutProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function PaymentCheckout({ onSuccess, onCancel }: PaymentCheckoutProps) {
    const { selectedGuildId } = useGuildContext();
    const analytics = useAnalytics();

    const [provider, setProvider] = useState<PaymentProvider>('stripe');
    const [tier, setTier] = useState<'monthly' | 'yearly'>('monthly');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sepayInfo, setSepayInfo] = useState<{ qrCode: string; bankInfo: BankInfo; orderId: string } | null>(null);

    // Auto-detect preferred payment method
    useEffect(() => {
        const config = detectPaymentProvider();
        setProvider(config.provider);
    }, []);

    const isVietnam = provider === 'sepay';
    const currency = isVietnam ? 'VND' : 'USD';
    const price = isVietnam
        ? PRICING.premium[tier].vnd
        : PRICING.premium[tier].usd;

    const handlePayment = async () => {
        if (!selectedGuildId) {
            setError('Please select a server first');
            return;
        }

        setLoading(true);
        setError(null);

        analytics.paymentStarted(provider, tier, price);

        if (provider === 'stripe') {
            const result = await createStripeSession(tier, selectedGuildId);
            if ('error' in result) {
                setError(result.error);
                setLoading(false);
            } else {
                // Redirect to Stripe Checkout
                window.location.href = result.url;
            }
        } else {
            const result = await createSepayPayment(tier, selectedGuildId);
            if ('error' in result) {
                setError(result.error);
                setLoading(false);
            } else {
                setSepayInfo(result);
                setLoading(false);
            }
        }
    };

    // Show SePay QR code if payment created
    if (sepayInfo) {
        return (
            <Card className="bg-white/5 border-white/10 max-w-md mx-auto">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Scan to Pay</CardTitle>
                    <CardDescription>
                        Use your banking app to scan this QR code or transfer manually
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* QR Code */}
                    <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                        <img
                            src={sepayInfo.qrCode}
                            alt="Payment QR Code"
                            className="w-48 h-48"
                        />
                    </div>

                    {/* Bank details */}
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-white/60">Bank</span>
                            <span className="font-medium">{sepayInfo.bankInfo.bankName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/60">Account</span>
                            <span className="font-mono">{sepayInfo.bankInfo.accountNumber}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/60">Name</span>
                            <span>{sepayInfo.bankInfo.accountName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/60">Amount</span>
                            <span className="font-bold text-cyan-400">
                                {formatPrice(sepayInfo.bankInfo.amount, 'VND')}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/60">Content</span>
                            <span className="font-mono text-xs bg-white/10 px-2 py-1 rounded">
                                {sepayInfo.bankInfo.content}
                            </span>
                        </div>
                    </div>

                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
                        <AlertCircle className="h-4 w-4 text-yellow-400 inline mr-2" />
                        Please include the exact content when transferring.
                        Your subscription will activate within 5 minutes after payment.
                    </div>

                    <Button variant="outline" className="w-full" onClick={onCancel}>
                        I&apos;ve Completed Payment
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/5 border-white/10 max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Upgrade to Premium</CardTitle>
                <CardDescription>
                    Choose your payment method and billing period
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Payment Method */}
                <div className="space-y-3">
                    <p className="text-sm font-medium">Payment Method</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setProvider('stripe')}
                            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${provider === 'stripe'
                                    ? 'border-cyan-500 bg-cyan-500/10'
                                    : 'border-white/10 hover:border-white/20'
                                }`}
                        >
                            <CreditCard className="h-5 w-5" />
                            <div className="text-left">
                                <p className="font-medium">Card</p>
                                <p className="text-xs text-white/60">Global</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setProvider('sepay')}
                            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${provider === 'sepay'
                                    ? 'border-cyan-500 bg-cyan-500/10'
                                    : 'border-white/10 hover:border-white/20'
                                }`}
                        >
                            <Building2 className="h-5 w-5" />
                            <div className="text-left">
                                <p className="font-medium">Bank</p>
                                <p className="text-xs text-white/60">Vietnam</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Billing Period */}
                <div className="space-y-3">
                    <p className="text-sm font-medium">Billing Period</p>
                    <div className="space-y-2">
                        <button
                            onClick={() => setTier('monthly')}
                            className={`w-full flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${tier === 'monthly'
                                    ? 'border-cyan-500 bg-cyan-500/10'
                                    : 'border-white/10 hover:border-white/20'
                                }`}
                        >
                            <span>Monthly</span>
                            <span className="font-bold">
                                {formatPrice(isVietnam ? PRICING.premium.monthly.vnd : PRICING.premium.monthly.usd, currency)}
                            </span>
                        </button>
                        <button
                            onClick={() => setTier('yearly')}
                            className={`w-full flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${tier === 'yearly'
                                    ? 'border-cyan-500 bg-cyan-500/10'
                                    : 'border-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span>Yearly</span>
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                    Save 17%
                                </span>
                            </div>
                            <span className="font-bold">
                                {formatPrice(isVietnam ? PRICING.premium.yearly.vnd : PRICING.premium.yearly.usd, currency)}
                            </span>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <Button
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
                    onClick={handlePayment}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            {provider === 'stripe' ? <CreditCard className="mr-2 h-4 w-4" /> : <QrCode className="mr-2 h-4 w-4" />}
                            Pay {formatPrice(price, currency)}
                        </>
                    )}
                </Button>

                {onCancel && (
                    <Button variant="ghost" className="w-full" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
