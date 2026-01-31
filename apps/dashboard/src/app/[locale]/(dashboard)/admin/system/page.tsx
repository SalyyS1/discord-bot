'use client';

import { useEffect, useState } from 'react';
import { SystemHealthMonitorCard } from '@/components/admin/system-health-monitor-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Activity } from 'lucide-react';

interface SystemHealthMetrics {
  database: {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    details?: string;
  };
  redis: {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    details?: string;
  };
  bots: {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    details?: string;
  };
  api: {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    details?: string;
  };
  uptime?: number;
  errorRate?: number;
}

export default function AdminSystemHealthPage() {
  const [metrics, setMetrics] = useState<SystemHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthMetrics();
    const interval = setInterval(fetchHealthMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchHealthMetrics() {
    try {
      // Mock health check - in production, implement real health endpoints
      const mockMetrics: SystemHealthMetrics = {
        database: {
          status: 'healthy',
          message: 'Connected to PostgreSQL',
          details: 'Pool: 10/100 connections active',
        },
        redis: {
          status: 'healthy',
          message: 'Connected to Redis',
          details: 'Latency: 2ms',
        },
        bots: {
          status: 'healthy',
          message: 'Manager service operational',
          details: '8/10 bot instances running',
        },
        api: {
          status: 'healthy',
          message: 'All endpoints responding',
          details: 'Avg response time: 150ms',
        },
        uptime: 2592000, // 30 days in seconds
        errorRate: 0.02,
      };

      setMetrics(mockMetrics);
    } catch (err) {
      console.error('Failed to fetch health metrics:', err);
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

  if (!metrics) {
    return (
      <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Unable to Load Health Metrics</h3>
          <p className="text-gray-400">System health data is unavailable</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Monitor */}
      <SystemHealthMonitorCard metrics={metrics} />

      {/* Additional System Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
          <CardHeader>
            <CardTitle className="text-white">Database Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Connection Pool</span>
                <span className="text-white font-mono">10/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Query Time (avg)</span>
                <span className="text-white font-mono">45ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Queries (24h)</span>
                <span className="text-white font-mono">1,234,567</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Slow Queries (24h)</span>
                <span className="text-white font-mono">23</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
          <CardHeader>
            <CardTitle className="text-white">Cache Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Redis Memory</span>
                <span className="text-white font-mono">245MB / 1GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Hit Rate</span>
                <span className="text-white font-mono">94.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Keys Stored</span>
                <span className="text-white font-mono">12,450</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Evictions (24h)</span>
                <span className="text-white font-mono">156</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
          <CardHeader>
            <CardTitle className="text-white">API Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Requests (24h)</span>
                <span className="text-white font-mono">45,678</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Response Time</span>
                <span className="text-white font-mono">150ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Error Rate</span>
                <span className="text-white font-mono">{metrics.errorRate?.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rate Limit Hits</span>
                <span className="text-white font-mono">234</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
          <CardHeader>
            <CardTitle className="text-white">Bot Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Bot Instances</span>
                <span className="text-white font-mono">10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Running Instances</span>
                <span className="text-white font-mono">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Memory Usage (total)</span>
                <span className="text-white font-mono">2.4GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Restart Count (24h)</span>
                <span className="text-white font-mono">3</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
