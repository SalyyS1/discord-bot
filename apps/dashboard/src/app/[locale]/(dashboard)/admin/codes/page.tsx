'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Key, Loader2, Plus, Trash2, Copy, CheckCircle } from 'lucide-react';

interface UpgradeCode {
    id: string;
    code: string;
    tier: 'FREE' | 'PREMIUM';
    durationDays: number;
    usedBy: string | null;
    usedAt: string | null;
    createdAt: string;
}

export default function AdminCodesPage() {
    const [codes, setCodes] = useState<UpgradeCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // New code form
    const [tier, setTier] = useState<'PREMIUM'>('PREMIUM');
    const [durationDays, setDurationDays] = useState('30');
    const [count, setCount] = useState('1');

    useEffect(() => {
        fetchCodes();
    }, []);

    async function fetchCodes() {
        try {
            const res = await fetch('/api/admin/codes');
            const data = await res.json();
            if (data.success) {
                setCodes(data.data);
            } else {
                setError(data.error || 'Failed to load codes');
            }
        } catch (err) {
            setError('Failed to load codes');
        } finally {
            setLoading(false);
        }
    }

    async function createCodes() {
        setCreating(true);
        setError(null);

        try {
            const res = await fetch('/api/admin/codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tier,
                    durationDays: parseInt(durationDays),
                    count: parseInt(count),
                }),
            });
            const data = await res.json();

            if (data.success) {
                setCodes(prev => [...data.data, ...prev]);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to create codes');
        } finally {
            setCreating(false);
        }
    }

    async function deleteCode(id: string) {
        try {
            const res = await fetch(`/api/admin/codes?id=${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                setCodes(prev => prev.filter(c => c.id !== id));
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to delete code');
        }
    }

    function copyCode(code: string) {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
        );
    }

    if (error === 'Admin access required') {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Key className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white">Access Denied</h3>
                    <p className="text-gray-400">Admin access required</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-white">Upgrade Codes</h2>
                <p className="text-gray-400 mt-1">Create and manage upgrade codes</p>
            </div>

            {/* Create New Codes */}
            <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Plus className="h-5 w-5 text-cyan-400" />
                        Create Codes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Tier</label>
                            <Select value={tier} onValueChange={(v: 'PREMIUM') => setTier(v)}>
                                <SelectTrigger className="w-32 bg-white/5 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PREMIUM">Premium</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Duration (days)</label>
                            <Select value={durationDays} onValueChange={setDurationDays}>
                                <SelectTrigger className="w-32 bg-white/5 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="3">3 days</SelectItem>
                                    <SelectItem value="5">5 days</SelectItem>
                                    <SelectItem value="7">7 days</SelectItem>
                                    <SelectItem value="30">30 days</SelectItem>
                                    <SelectItem value="90">90 days</SelectItem>
                                    <SelectItem value="365">365 days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Count</label>
                            <Input
                                type="number"
                                min="1"
                                max="100"
                                value={count}
                                onChange={(e) => setCount(e.target.value)}
                                className="w-20 bg-white/5 border-white/10"
                            />
                        </div>
                        <Button onClick={createCodes} disabled={creating} className="bg-cyan-500 hover:bg-cyan-600">
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Codes List */}
            <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Key className="h-5 w-5 text-yellow-400" />
                        All Codes ({codes.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {codes.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">No codes created yet</p>
                        ) : (
                            codes.map((code) => (
                                <div key={code.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                    <div className="flex items-center gap-4">
                                        <code className="font-mono text-white bg-black/30 px-2 py-1 rounded">
                                            {code.code}
                                        </code>
                                        <Badge className={code.tier === 'PREMIUM' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-500/20'}>
                                            {code.tier}
                                        </Badge>
                                        <span className="text-sm text-gray-400">{code.durationDays} days</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {code.usedBy ? (
                                            <Badge className="bg-red-500/20 text-red-400">Used</Badge>
                                        ) : (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => copyCode(code.code)}
                                                    className="text-gray-400 hover:text-white"
                                                >
                                                    {copiedCode === code.code ? (
                                                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => deleteCode(code.id)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
