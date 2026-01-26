'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import {
  Users,
  MessageSquare,
  Ticket,
  Star,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type Period = '7d' | '30d' | '90d';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changePercent?: string;
  icon: typeof Users;
  loading?: boolean;
}

function MetricCard({ title, value, change, changePercent, icon: Icon, loading }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className="bg-surface-1 border-white/10">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-8 w-20 bg-white/10 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-3xl font-bold mt-1">{value}</p>
            )}
            {change !== undefined && !loading && (
              <div className={`flex items-center gap-1 mt-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{isPositive ? '+' : ''}{change}</span>
                {changePercent && <span className="text-muted-foreground">({changePercent}%)</span>}
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-aqua-500/10">
            <Icon className="w-6 h-6 text-aqua-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SimpleLineChart({ data, dataKey, label }: { data: Record<string, unknown>[]; dataKey: string; label: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Number(d[dataKey]) || 0));
  const minValue = Math.min(...data.map(d => Number(d[dataKey]) || 0));
  const range = maxValue - minValue || 1;

  return (
    <div className="h-64 relative">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-xs text-muted-foreground">
        <span>{maxValue}</span>
        <span>{Math.round((maxValue + minValue) / 2)}</span>
        <span>{minValue}</span>
      </div>

      {/* Chart area */}
      <div className="ml-14 h-full flex items-end gap-1 pb-6">
        {data.map((item, index) => {
          const height = ((Number(item[dataKey]) - minValue) / range) * 100 || 5;
          return (
            <div
              key={index}
              className="flex-1 bg-aqua-500/50 hover:bg-aqua-500/70 transition-colors rounded-t"
              style={{ height: `${Math.max(height, 5)}%` }}
              title={`${item.date}: ${item[dataKey]} ${label}`}
            />
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="ml-14 flex justify-between text-xs text-muted-foreground">
        <span>{String(data[0]?.date || '').slice(5)}</span>
        <span>{String(data[Math.floor(data.length / 2)]?.date || '').slice(5)}</span>
        <span>{String(data[data.length - 1]?.date || '').slice(5)}</span>
      </div>
    </div>
  );
}

function PieChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const colors = ['bg-aqua-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'];

  return (
    <div className="flex items-center gap-8">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
          {data.map((item, index) => {
            const prevTotal = data.slice(0, index).reduce((sum, d) => sum + d.value, 0);
            const percentage = (item.value / total) * 100;
            const dashArray = `${percentage} ${100 - percentage}`;
            const dashOffset = -prevTotal / total * 100;

            return (
              <circle
                key={item.name}
                cx="18"
                cy="18"
                r="15.9"
                fill="transparent"
                stroke={`hsl(${168 + index * 30}, 76%, ${50 - index * 10}%)`}
                strokeWidth="3"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{total}</span>
        </div>
      </div>

      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
            <span className="text-sm">{item.name}</span>
            <span className="text-sm text-muted-foreground">({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const params = useParams();
  const guildId = params?.guildId as string;
  const [period, setPeriod] = useState<Period>('30d');

  // In a real implementation, get guildId from context
  const { data, isLoading, error: _error } = useSWR(
    guildId ? `/api/guilds/${guildId}/analytics?period=${period}` : null,
    fetcher
  );

  const analytics = data?.data;

  if (!guildId) {
    return (
      <div className="p-8">
        <Card className="bg-surface-1 border-white/10">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Analytics Dashboard</h2>
            <p className="text-muted-foreground">
              Select a server from the sidebar to view analytics
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your server's growth and engagement</p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 p-1 rounded-lg bg-surface-1 border border-white/10">
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? 'default' : 'ghost'}
              onClick={() => setPeriod(p)}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Members"
          value={analytics?.currentMembers ?? '-'}
          change={analytics?.memberChange}
          changePercent={analytics?.memberChangePercent}
          icon={Users}
          loading={isLoading}
        />
        <MetricCard
          title="Messages"
          value={analytics?.totalMessages ?? '-'}
          icon={MessageSquare}
          loading={isLoading}
        />
        <MetricCard
          title="Tickets"
          value={analytics?.totalTickets ?? '-'}
          icon={Ticket}
          loading={isLoading}
        />
        <MetricCard
          title="Avg Rating"
          value={analytics?.avgRating ?? '-'}
          icon={Star}
          loading={isLoading}
        />
      </div>

      {/* Member Growth Chart */}
      <Card className="bg-surface-1 border-white/10">
        <CardHeader>
          <CardTitle>Member Growth</CardTitle>
          <CardDescription>Track member count over time</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 bg-white/5 rounded animate-pulse" />
          ) : (
            <SimpleLineChart
              data={analytics?.memberGrowth || []}
              dataKey="members"
              label="members"
            />
          )}
        </CardContent>
      </Card>

      {/* Two Column Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Ticket Volume */}
        <Card className="bg-surface-1 border-white/10">
          <CardHeader>
            <CardTitle>Ticket Volume</CardTitle>
            <CardDescription>Tickets opened over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-white/5 rounded animate-pulse" />
            ) : (
              <SimpleLineChart
                data={analytics?.ticketVolume || []}
                dataKey="opened"
                label="tickets"
              />
            )}
          </CardContent>
        </Card>

        {/* Feature Usage */}
        <Card className="bg-surface-1 border-white/10">
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
            <CardDescription>Activity breakdown by feature</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {isLoading ? (
              <div className="w-32 h-32 bg-white/5 rounded-full animate-pulse" />
            ) : (
              <PieChart data={analytics?.featureUsage || []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leveling Stats */}
      <Card className="bg-surface-1 border-white/10">
        <CardHeader>
          <CardTitle>Leveling System</CardTitle>
          <CardDescription>Engagement metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-white/5">
              <p className="text-3xl font-bold">{analytics?.leveling?.totalXP?.toLocaleString() || '-'}</p>
              <p className="text-sm text-muted-foreground">Total XP Earned</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-white/5">
              <p className="text-3xl font-bold">{analytics?.leveling?.avgLevel || '-'}</p>
              <p className="text-sm text-muted-foreground">Average Level</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-white/5">
              <p className="text-3xl font-bold">{analytics?.leveling?.activeMembers?.toLocaleString() || '-'}</p>
              <p className="text-sm text-muted-foreground">Active Members</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
