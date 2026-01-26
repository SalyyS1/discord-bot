'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BotCard } from '@/components/bots/bot-card';
import {
  Plus,
  Bot,
  Loader2,
  Sparkles,
  Shield,
  Zap,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ERROR';
  tier: 'FREE' | 'PRO' | 'ULTRA';
  isRunning: boolean;
  currentGuilds: number;
  botUsername?: string | null;
  botAvatar?: string | null;
  lastError?: string | null;
  createdAt: string;
}

export default function BotsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch('/api/tenants');
      if (res.ok) {
        const { data } = await res.json();
        setTenants(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleStart = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/tenants/${id}/start`, { method: 'POST' });
      if (res.ok) {
        toast.success('Bot started successfully');
        fetchTenants();
      } else {
        const { error } = await res.json();
        toast.error(error || 'Failed to start bot');
      }
    } catch {
      toast.error('Failed to start bot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/tenants/${id}/stop`, { method: 'POST' });
      if (res.ok) {
        toast.success('Bot stopped successfully');
        fetchTenants();
      } else {
        const { error } = await res.json();
        toast.error(error || 'Failed to stop bot');
      }
    } catch {
      toast.error('Failed to stop bot');
    } finally {
      setActionLoading(null);
    }
  };

  const canCreateBot = tenants.length === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bot className="w-8 h-8 text-indigo-400" />
            My Bots
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your custom Discord bots
          </p>
        </div>

        <Link href="/dashboard/bots/new">
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={!canCreateBot}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Bot
          </Button>
        </Link>
      </div>

      {/* Plan Info */}
      <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/20 rounded-xl">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Free Plan</h3>
                <p className="text-sm text-gray-400">1 bot • 1 server per bot</p>
              </div>
            </div>
            <Button variant="outline" className="border-indigo-500/50 text-indigo-400">
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bots List */}
      {tenants.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Your Bots ({tenants.length})</h2>
          <div className="grid gap-4">
            {tenants.map((tenant) => (
              <BotCard
                key={tenant.id}
                {...tenant}
                onStart={() => handleStart(tenant.id)}
                onStop={() => handleStop(tenant.id)}
                loading={actionLoading === tenant.id}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card className="bg-black/40 border-white/10 border-dashed">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No bots yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create your first custom Discord bot by providing your own bot token.
              Your data stays isolated and secure.
            </p>
            <Link href="/dashboard/bots/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Bot
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <h4 className="font-medium text-white">Secure Storage</h4>
            </div>
            <p className="text-sm text-gray-400">
              Your bot token is encrypted with AES-256 and stored securely.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="font-medium text-white">Isolated Data</h4>
            </div>
            <p className="text-sm text-gray-400">
              Each bot has its own database schema. No data mixing.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Info className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="font-medium text-white">Full Control</h4>
            </div>
            <p className="text-sm text-gray-400">
              Use your own Discord bot token. Start, stop, and manage anytime.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
