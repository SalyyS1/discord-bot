'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Crown, User, Calendar, Loader2, CheckCircle, XCircle, Sparkles } from 'lucide-react';

interface Subscription {
    tier: 'FREE' | 'PREMIUM';
    expiresAt: string | null;
    isExpired: boolean;
    isAdmin: boolean;
}

export default function ProfilePage() {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [redeemCode, setRedeemCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [redeemError, setRedeemError] = useState<string | null>(null);
    const [redeemSuccess, setRedeemSuccess] = useState(false);

    useEffect(() => {
        async function fetchSubscription() {
            try {
                const res = await fetch('/api/user/subscription');
                const data = await res.json();
                if (data.success) {
                    setSubscription(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch subscription:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchSubscription();
    }, []);

    async function handleRedeem() {
        if (!redeemCode.trim()) return;

        setRedeeming(true);
        setRedeemError(null);
        setRedeemSuccess(false);

        try {
            const res = await fetch('/api/user/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: redeemCode }),
            });
            const data = await res.json();

            if (data.success) {
                setRedeemSuccess(true);
                setRedeemCode('');
                // Refetch subscription
                const subRes = await fetch('/api/user/subscription');
                const subData = await subRes.json();
                if (subData.success) {
                    setSubscription(subData.data);
                }
            } else {
                setRedeemError(data.error || 'Failed to redeem code');
            }
        } catch (error) {
            setRedeemError('Failed to redeem code');
        } finally {
            setRedeeming(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold text-white">Profile</h2>
                <p className="text-gray-400 mt-1">Manage your account and subscription</p>
            </div>

            {/* User Info */}
            <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <User className="h-5 w-5 text-cyan-400" />
                        Account Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                            <User className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-semibold text-white">Premium User</p>
                            <p className="text-gray-400">Manage your subscription below</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Subscription */}
            <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Crown className="h-5 w-5 text-yellow-400" />
                        Subscription
                    </CardTitle>
                    <CardDescription>Your current plan and features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Current Tier */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                        <div>
                            <p className="text-sm text-gray-400">Current Plan</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge
                                    className={subscription?.tier === 'PREMIUM'
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                                        : 'bg-gray-600 text-gray-200'
                                    }
                                >
                                    {subscription?.tier === 'PREMIUM' && <Sparkles className="h-3 w-3 mr-1" />}
                                    {subscription?.tier || 'FREE'}
                                </Badge>
                                {subscription?.isAdmin && (
                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                        Admin
                                    </Badge>
                                )}
                            </div>
                        </div>
                        {subscription?.tier === 'PREMIUM' && subscription.expiresAt && (
                            <div className="text-right">
                                <p className="text-sm text-gray-400">Expires</p>
                                <p className="text-white flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(subscription.expiresAt).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Redeem Code */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-white">Have a code? Redeem it here</p>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter upgrade code"
                                value={redeemCode}
                                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                                className="bg-white/5 border-white/10 text-white font-mono"
                                disabled={redeeming}
                            />
                            <Button
                                onClick={handleRedeem}
                                disabled={redeeming || !redeemCode.trim()}
                                className="bg-cyan-500 hover:bg-cyan-600"
                            >
                                {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Redeem'}
                            </Button>
                        </div>

                        {redeemError && (
                            <p className="text-sm text-red-400 flex items-center gap-1">
                                <XCircle className="h-4 w-4" />
                                {redeemError}
                            </p>
                        )}
                        {redeemSuccess && (
                            <p className="text-sm text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                Code redeemed successfully!
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
