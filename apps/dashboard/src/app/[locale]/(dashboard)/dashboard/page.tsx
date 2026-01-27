'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  MessageSquare,
  Ticket,
  Gift,
  Activity,
  ArrowUpRight,
  Shield,
  Zap,
  Bot,
  Award,
  AlertTriangle,
  Hash,
  Crown,
  TrendingUp,
  Clock,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useSelectedGuild } from '@/hooks/use-selected-guild';
import { GrowthChart } from '@/components/analytics/growth-chart';

interface GuildStats {
  guild: {
    id: string;
    name: string;
    joinedAt: string;
  };
  stats: {
    members: number;
    tickets: { total: number; open: number };
    giveaways: { total: number; active: number };
    warnings: number;
    autoresponders: number;
    levelRoles: number;
    messages: number;
  };
  features: {
    levelingEnabled: boolean;
    antiSpamEnabled: boolean;
    antiLinkEnabled: boolean;
  };
  leaderboard: Array<{ nodeName: string; xp: number; level: number }>;
  levelDistribution: Array<{ level: number; count: number }>;
  recentActivity: Array<{ id: string; action: string; reason: string | null; time: string }>;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = 'cyan'
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; label: string };
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30',
  };

  const iconColorClasses: Record<string, string> = {
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    pink: 'text-pink-400',
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  };

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span className="text-xs text-emerald-400">+{trend.value}%</span>
                <span className="text-xs text-gray-500">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-white/5 ${iconColorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { guildId, guild, loading: guildLoading } = useSelectedGuild();
  const [stats, setStats] = useState<GuildStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<Array<{ date: string; members: number; messages: number }>>([]);

  useEffect(() => {
    if (!guildId) return;

    async function fetchStats() {
      // Clear old data first to prevent showing stale data
      setStats(null);
      setChartData([]);
      setLoading(true);

      try {
        const res = await fetch(`/api/guilds/${guildId}/stats`);
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }

        // Fetch chart data
        const chartRes = await fetch(`/api/guilds/${guildId}/chart`);
        if (chartRes.ok) {
          const chartJson = await chartRes.json();
          setChartData(chartJson.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [guildId]);

  if (guildLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!guildId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Bot className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Server Selected</h3>
          <p className="text-gray-400">Select a server from the sidebar to view statistics.</p>
        </div>
      </div>
    );
  }

  // Generate mock chart data if empty
  const displayChartData = chartData.length > 0 ? chartData : Array.from({ length: 7 }).map((_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    members: (stats?.stats.members || 100) + i * 5,
    messages: (stats?.stats.messages || 500) + i * 50,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            {guild?.name || 'Dashboard'}
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
              Online
            </Badge>
          </h2>
          <p className="text-gray-400 mt-1">
            Real-time statistics and analytics for your server
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="h-4 w-4" />
          Last updated: Just now
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tracked Members"
          value={stats?.stats.members?.toLocaleString() || '0'}
          icon={Users}
          color="cyan"
          description="Members with XP activity"
        />
        <StatCard
          title="Messages Sent"
          value={stats?.stats.messages?.toLocaleString() || '0'}
          icon={MessageSquare}
          color="purple"
          description="Total messages tracked"
        />
        <StatCard
          title="Open Tickets"
          value={`${stats?.stats.tickets.open || 0}/${stats?.stats.tickets.total || 0}`}
          icon={Ticket}
          color="blue"
          description="Active support tickets"
        />
        <StatCard
          title="Active Giveaways"
          value={stats?.stats.giveaways.active || 0}
          icon={Gift}
          color="pink"
          description={`${stats?.stats.giveaways.total || 0} total hosted`}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Warnings"
          value={stats?.stats.warnings || 0}
          icon={AlertTriangle}
          color="yellow"
        />
        <StatCard
          title="Auto Responders"
          value={stats?.stats.autoresponders || 0}
          icon={Bot}
          color="emerald"
        />
        <StatCard
          title="Level Roles"
          value={stats?.stats.levelRoles || 0}
          icon={Award}
          color="purple"
        />
        <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Leveling</p>
                <p className="text-lg font-semibold text-white">
                  {stats?.features.levelingEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <Zap className={`h-5 w-5 ${stats?.features.levelingEnabled ? 'text-cyan-400' : 'text-gray-500'}`} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Anti-Spam</p>
                <p className="text-lg font-semibold text-white">
                  {stats?.features.antiSpamEnabled ? 'Active' : 'Off'}
                </p>
              </div>
              <Shield className={`h-5 w-5 ${stats?.features.antiSpamEnabled ? 'text-red-400' : 'text-gray-500'}`} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Anti-Link</p>
                <p className="text-lg font-semibold text-white">
                  {stats?.features.antiLinkEnabled ? 'Active' : 'Off'}
                </p>
              </div>
              <Hash className={`h-5 w-5 ${stats?.features.antiLinkEnabled ? 'text-blue-400' : 'text-gray-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Growth Chart */}
        <Card className="lg:col-span-4 bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-cyan-400" />
              Growth Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GrowthChart data={displayChartData} />
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="lg:col-span-3 bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              Top Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.leaderboard?.slice(0, 5).map((member, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      index === 1 ? 'bg-gray-400/20 text-gray-300' :
                        index === 2 ? 'bg-amber-600/20 text-amber-500' :
                          'bg-white/10 text-gray-400'
                    }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {member.nodeName || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Level {member.level} · {member.xp.toLocaleString()} XP
                    </p>
                  </div>
                  <Badge variant="outline" className="text-cyan-400 border-cyan-500/30">
                    Lv.{member.level}
                  </Badge>
                </div>
              )) || (
                  <p className="text-gray-400 text-center py-8">No members yet</p>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Distribution & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Level Distribution */}
        <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              Level Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.levelDistribution?.slice(0, 5).map((level) => (
                <div key={level.level} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Level {level.level}</span>
                    <span className="text-white font-medium">{level.count} members</span>
                  </div>
                  <Progress
                    value={(level.count / (stats?.stats.members || 1)) * 100}
                    className="h-2 bg-white/10"
                  />
                </div>
              )) || (
                  <p className="text-gray-400 text-center py-8">No level data</p>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              Recent Moderation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.recentActivity?.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg bg-white/5">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {activity.action.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {activity.reason || 'No reason provided'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.time).toLocaleString()}
                    </p>
                  </div>
                </div>
              )) || (
                  <p className="text-gray-400 text-center py-8">No recent activity</p>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
