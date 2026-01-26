'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Bot,
  ArrowLeft,
  Play,
  Square,
  RefreshCw,
  Server,
  Activity,
  Clock,
  AlertTriangle,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ERROR';
  tier: 'FREE' | 'PRO' | 'ULTRA';
  discordClientId: string;
  botUsername?: string | null;
  botAvatar?: string | null;
  isRunning: boolean;
  processId?: number | null;
  currentGuilds: number;
  lastStartedAt?: string | null;
  lastStoppedAt?: string | null;
  lastError?: string | null;
  errorCount: number;
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  ACTIVE: { label: 'Online', color: 'bg-green-500', icon: CheckCircle },
  SUSPENDED: { label: 'Stopped', color: 'bg-gray-500', icon: Square },
  ERROR: { label: 'Error', color: 'bg-red-500', icon: XCircle },
};

export default function BotDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [newToken, setNewToken] = useState('');

  const fetchTenant = useCallback(async () => {
    try {
      const res = await fetch(`/api/tenants/${id}`);
      if (res.ok) {
        const { data } = await res.json();
        setTenant(data);
      } else if (res.status === 404) {
        router.push('/dashboard/bots');
      }
    } catch (error) {
      console.error('Failed to fetch tenant:', error);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchTenant();
    // Poll for status updates every 10 seconds when running
    const interval = setInterval(() => {
      if (tenant?.isRunning) {
        fetchTenant();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchTenant, tenant?.isRunning]);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tenants/${id}/start`, { method: 'POST' });
      if (res.ok) {
        toast.success('Bot started successfully');
        fetchTenant();
      } else {
        const { error } = await res.json();
        toast.error(error || 'Failed to start bot');
      }
    } catch {
      toast.error('Failed to start bot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tenants/${id}/stop`, { method: 'POST' });
      if (res.ok) {
        toast.success('Bot stopped successfully');
        fetchTenant();
      } else {
        const { error } = await res.json();
        toast.error(error || 'Failed to stop bot');
      }
    } catch {
      toast.error('Failed to stop bot');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tenants/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Bot deleted successfully');
        router.push('/dashboard/bots');
      } else {
        const { error } = await res.json();
        toast.error(error || 'Failed to delete bot');
      }
    } catch {
      toast.error('Failed to delete bot');
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleUpdateToken = async () => {
    if (!newToken.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordToken: newToken }),
      });
      if (res.ok) {
        toast.success('Token updated successfully');
        setNewToken('');
        fetchTenant();
      } else {
        const { error } = await res.json();
        toast.error(error || 'Failed to update token');
      }
    } catch {
      toast.error('Failed to update token');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  const StatusIcon = statusConfig[tenant.status].icon;
  const maxGuilds = tenant.tier === 'FREE' ? 1 : tenant.tier === 'PRO' ? 2 : 3;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard/bots" className="inline-flex items-center text-gray-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bots
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
                {tenant.botAvatar ? (
                  <img src={tenant.botAvatar} alt={tenant.name} className="w-full h-full object-cover" />
                ) : (
                  <Bot className="w-8 h-8 text-white" />
                )}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-black ${statusConfig[tenant.status].color}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                {tenant.name}
                <Badge className={`${statusConfig[tenant.status].color} text-white`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig[tenant.status].label}
                </Badge>
              </h1>
              {tenant.botUsername && (
                <p className="text-gray-400">@{tenant.botUsername}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tenant.isRunning ? (
              <Button
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                onClick={handleStop}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Square className="w-4 h-4 mr-2" />}
                Stop Bot
              </Button>
            ) : (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleStart}
                disabled={actionLoading || tenant.status === 'PENDING'}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Start Bot
              </Button>
            )}

            <Button variant="outline" onClick={fetchTenant}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {tenant.status === 'ERROR' && tenant.lastError && (
        <Alert className="bg-red-500/10 border-red-500/30">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <AlertDescription className="text-red-200">
            <strong>Error:</strong> {tenant.lastError}
            {tenant.errorCount >= 3 && (
              <span className="block mt-1 text-sm">
                Failed {tenant.errorCount} times. Please check your credentials.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Server className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Servers</p>
                <p className="text-2xl font-bold text-white">{tenant.currentGuilds}/{maxGuilds}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className="text-2xl font-bold text-white">{tenant.isRunning ? 'Running' : 'Stopped'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Last Started</p>
                <p className="text-xl font-bold text-white">
                  {tenant.lastStartedAt
                    ? new Date(tenant.lastStartedAt).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-black/40 border border-white/10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Bot Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400">Client ID</p>
                  <p className="text-white font-mono">{tenant.discordClientId}</p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400">Plan</p>
                  <p className="text-white capitalize">{tenant.tier.toLowerCase()}</p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400">Created</p>
                  <p className="text-white">{new Date(tenant.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400">Process ID</p>
                  <p className="text-white font-mono">{tenant.processId || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Update Token</CardTitle>
              <CardDescription>Change your bot token (bot must be stopped first)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-yellow-500/10 border-yellow-500/30">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  Stop the bot before updating credentials. Never share your token.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="newToken">New Bot Token</Label>
                <div className="relative">
                  <Input
                    id="newToken"
                    type={showToken ? 'text' : 'password'}
                    placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4.XXXXXX..."
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value)}
                    disabled={tenant.isRunning}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                onClick={handleUpdateToken}
                disabled={!newToken.trim() || tenant.isRunning || actionLoading}
              >
                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Token
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="space-y-6">
          <Card className="bg-red-950/20 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400">Danger Zone</CardTitle>
              <CardDescription className="text-red-300/70">
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg">
                <div>
                  <p className="font-medium text-white">Delete Bot</p>
                  <p className="text-sm text-gray-400">
                    Permanently delete this bot and all associated data.
                  </p>
                </div>
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      disabled={tenant.isRunning}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Bot
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Delete Bot</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete "{tenant.name}"? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        className="bg-red-600 hover:bg-red-700"
                        onClick={handleDelete}
                        disabled={actionLoading}
                      >
                        {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Delete
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {tenant.isRunning && (
                <p className="text-sm text-yellow-400">
                  Stop the bot before deleting.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
