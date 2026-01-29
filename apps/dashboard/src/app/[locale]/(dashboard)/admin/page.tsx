'use client';

import { useEffect, useState } from 'react';
import { AdminStatsGrid } from '@/components/admin/admin-stats-grid-cards';
import { TenantAuditLogViewer } from '@/components/admin/tenant-audit-log-viewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';

interface AdminStats {
  users: { total: number; free: number; premium: number };
  tenants: { total: number; active: number; suspended: number; pending: number; error: number };
  guilds: { total: number; active: number };
  bots: { running: number; stopped: number };
  recentActivity: Array<{
    id: string;
    action: string;
    userId: string;
    timestamp: Date;
    metadata: unknown;
  }>;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();

      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || 'Failed to load stats');
      }
    } catch (err) {
      setError('Failed to connect to server');
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

  if (error) {
    return (
      <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading Admin Data</h3>
          <p className="text-gray-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <AdminStatsGrid stats={stats} />

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TenantAuditLogViewer
          logs={stats.recentActivity}
          title="Recent Admin Activity"
        />

        {/* System Alerts */}
        <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.tenants.error > 0 && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="font-medium text-red-400">Tenants in Error State</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {stats.tenants.error} tenant{stats.tenants.error > 1 ? 's' : ''} require attention
                  </div>
                </div>
              )}
              {stats.tenants.pending > 0 && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="font-medium text-yellow-400">Pending Tenants</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {stats.tenants.pending} tenant{stats.tenants.pending > 1 ? 's' : ''} awaiting validation
                  </div>
                </div>
              )}
              {stats.bots.stopped > stats.bots.running && (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="font-medium text-orange-400">More Bots Stopped Than Running</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {stats.bots.stopped} stopped vs {stats.bots.running} running
                  </div>
                </div>
              )}
              {stats.tenants.error === 0 && stats.tenants.pending === 0 && stats.bots.stopped <= stats.bots.running && (
                <div className="text-center py-8 text-gray-400">
                  No system alerts
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
