'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Zap, AlertCircle } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface SystemHealthMetrics {
  database: HealthStatus;
  redis: HealthStatus;
  bots: HealthStatus;
  api: HealthStatus;
  uptime?: number;
  errorRate?: number;
}

interface SystemHealthMonitorCardProps {
  metrics: SystemHealthMetrics;
}

export function SystemHealthMonitorCard({ metrics }: SystemHealthMonitorCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'error':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Activity className="h-4 w-4 text-emerald-400" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-400" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Database Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-cyan-400" />
              <div>
                <div className="font-medium text-white">Database</div>
                <div className="text-xs text-gray-400">{metrics.database.message}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(metrics.database.status)}
              <Badge className={getStatusColor(metrics.database.status)}>
                {metrics.database.status}
              </Badge>
            </div>
          </div>

          {/* Redis Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-cyan-400" />
              <div>
                <div className="font-medium text-white">Redis</div>
                <div className="text-xs text-gray-400">{metrics.redis.message}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(metrics.redis.status)}
              <Badge className={getStatusColor(metrics.redis.status)}>
                {metrics.redis.status}
              </Badge>
            </div>
          </div>

          {/* Bot Services Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-cyan-400" />
              <div>
                <div className="font-medium text-white">Bot Services</div>
                <div className="text-xs text-gray-400">{metrics.bots.message}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(metrics.bots.status)}
              <Badge className={getStatusColor(metrics.bots.status)}>
                {metrics.bots.status}
              </Badge>
            </div>
          </div>

          {/* API Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-cyan-400" />
              <div>
                <div className="font-medium text-white">API Gateway</div>
                <div className="text-xs text-gray-400">{metrics.api.message}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(metrics.api.status)}
              <Badge className={getStatusColor(metrics.api.status)}>
                {metrics.api.status}
              </Badge>
            </div>
          </div>

          {/* Additional Metrics */}
          {(metrics.uptime || metrics.errorRate !== undefined) && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              {metrics.uptime && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">System Uptime</div>
                  <div className="text-lg font-semibold text-white">{formatUptime(metrics.uptime)}</div>
                </div>
              )}
              {metrics.errorRate !== undefined && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Error Rate</div>
                  <div className="text-lg font-semibold text-white">{metrics.errorRate.toFixed(2)}%</div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
