'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TenantAuditLogViewer } from '@/components/admin/tenant-audit-log-viewer';
import { Loader2, Bot, Server, AlertCircle, PlayCircle, StopCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TenantDetail {
  id: string;
  name: string;
  status: string;
  tier: string;
  isRunning: boolean;
  currentGuilds: number;
  botUsername: string | null;
  createdAt: string;
  lastStartedAt: string | null;
  lastError: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  auditLogs: Array<{
    id: string;
    action: string;
    userId: string;
    timestamp: Date;
    metadata: unknown;
  }>;
}

export default function AdminTenantDetailPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchTenantDetail();
    }
  }, [tenantId]);

  async function fetchTenantDetail() {
    try {
      const res = await fetch(`/api/admin/tenants?id=${tenantId}`);
      const data = await res.json();

      if (data.success) {
        setTenant(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Tenant Not Found</h3>
          <p className="text-gray-400">{error || 'This tenant does not exist'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tenant Overview */}
      <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Bot className="h-5 w-5 text-cyan-400" />
                {tenant.name}
              </CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                {tenant.botUsername || 'Bot not validated'}
              </p>
            </div>
            <div className="flex gap-2">
              {tenant.isRunning ? (
                <Button size="sm" variant="outline" className="border-orange-500/50 text-orange-400">
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Bot
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="border-emerald-500/50 text-emerald-400">
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Bot
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-gray-400 mb-1">Status</div>
              <Badge className={
                tenant.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                tenant.status === 'SUSPENDED' ? 'bg-red-500/20 text-red-400' :
                tenant.status === 'ERROR' ? 'bg-orange-500/20 text-orange-400' :
                'bg-yellow-500/20 text-yellow-400'
              }>
                {tenant.status}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Tier</div>
              <Badge className={
                tenant.tier === 'ULTRA' ? 'bg-purple-500/20 text-purple-400' :
                tenant.tier === 'PRO' ? 'bg-cyan-500/20 text-cyan-400' :
                'bg-gray-500/20 text-gray-400'
              }>
                {tenant.tier}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Current Guilds</div>
              <div className="text-white font-medium">{tenant.currentGuilds}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Created</div>
              <div className="text-white">
                {formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true })}
              </div>
            </div>
            {tenant.lastStartedAt && (
              <div>
                <div className="text-sm text-gray-400 mb-1">Last Started</div>
                <div className="text-white">
                  {formatDistanceToNow(new Date(tenant.lastStartedAt), { addSuffix: true })}
                </div>
              </div>
            )}
            {tenant.lastError && (
              <div className="md:col-span-2">
                <div className="text-sm text-gray-400 mb-1">Last Error</div>
                <div className="text-red-400 font-mono text-sm bg-red-500/10 p-2 rounded">
                  {tenant.lastError}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Owner Info */}
      <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
        <CardHeader>
          <CardTitle className="text-white">Owner Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="text-gray-400">Name: </span>
              <span className="text-white">{tenant.user.name || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-400">Email: </span>
              <span className="text-white">{tenant.user.email}</span>
            </div>
            <div>
              <span className="text-gray-400">User ID: </span>
              <span className="text-white font-mono text-sm">{tenant.user.id}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <TenantAuditLogViewer logs={tenant.auditLogs} title="Tenant Activity" />
    </div>
  );
}
