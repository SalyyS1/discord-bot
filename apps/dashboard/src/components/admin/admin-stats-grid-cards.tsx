'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Server, Bot, TrendingUp } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
}

function StatsCard({ title, value, subtitle, icon, trend }: StatsCardProps) {
  return (
    <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
        <div className="text-cyan-400">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            <span className="text-xs text-emerald-400">+{trend}% from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AdminStatsGridProps {
  stats: {
    users: { total: number; free: number; premium: number };
    tenants: { total: number; active: number; suspended: number };
    guilds: { total: number; active: number };
    bots: { running: number; stopped: number };
  };
}

export function AdminStatsGrid({ stats }: AdminStatsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Users"
        value={stats.users.total}
        subtitle={`${stats.users.premium} premium`}
        icon={<Users className="h-4 w-4" />}
      />
      <StatsCard
        title="Tenants"
        value={stats.tenants.total}
        subtitle={`${stats.tenants.active} active`}
        icon={<Server className="h-4 w-4" />}
      />
      <StatsCard
        title="Guilds"
        value={stats.guilds.active}
        subtitle={`${stats.guilds.total} total`}
        icon={<Server className="h-4 w-4" />}
      />
      <StatsCard
        title="Running Bots"
        value={stats.bots.running}
        subtitle={`${stats.bots.stopped} stopped`}
        icon={<Bot className="h-4 w-4" />}
      />
    </div>
  );
}
