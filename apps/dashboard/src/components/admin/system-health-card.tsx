'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Server, Zap } from 'lucide-react';

interface HealthStatus {
  database: 'healthy' | 'degraded' | 'down';
  api: 'healthy' | 'degraded' | 'down';
  discord: 'healthy' | 'degraded' | 'down';
}

export function SystemHealthCard() {
  const [health, setHealth] = useState<HealthStatus>({
    database: 'healthy',
    api: 'healthy',
    discord: 'healthy',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      try {
        const response = await fetch('/api/admin/health');
        if (response.ok) {
          const data = await response.json();
          setHealth(data);
        }
      } catch (error) {
        console.error('Failed to check health:', error);
        setHealth({
          database: 'down',
          api: 'down',
          discord: 'down',
        });
      } finally {
        setLoading(false);
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const services = [
    {
      name: 'Database',
      status: health.database,
      icon: Database,
    },
    {
      name: 'API',
      status: health.api,
      icon: Server,
    },
    {
      name: 'Discord Bot',
      status: health.discord,
      icon: Zap,
    },
  ];

  const overallHealthy = Object.values(health).every(s => s === 'healthy');

  return (
    <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5" />
          System Health
        </h3>
        <Badge
          variant={overallHealthy ? 'default' : 'destructive'}
          className={overallHealthy ? 'bg-green-500' : ''}
        >
          {loading ? 'Checking...' : overallHealthy ? 'All Systems Operational' : 'Issues Detected'}
        </Badge>
      </div>

      <div className="space-y-3">
        {services.map((service) => (
          <div
            key={service.name}
            className="flex items-center justify-between p-3 rounded-lg bg-white/5"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br from-${service.status === 'healthy' ? 'green' : service.status === 'degraded' ? 'yellow' : 'red'}-500/20`}>
                <service.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white">{service.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(service.status)} animate-pulse`} />
              <span className="text-sm text-white/60 capitalize">{service.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-white/40">
          Last checked: {loading ? 'Checking...' : new Date().toLocaleTimeString()}
        </p>
      </div>
    </Card>
  );
}
