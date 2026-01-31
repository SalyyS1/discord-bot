'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Users, Building2, Bot, Activity } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalTenants: number;
  totalGuilds: number;
  activeBots: number;
}

export function AdminStatsGrid() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTenants: 0,
    totalGuilds: 0,
    activeBots: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const statItems = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'from-blue-500/20 to-blue-600/20',
    },
    {
      label: 'Total Tenants',
      value: stats.totalTenants,
      icon: Building2,
      color: 'text-green-400',
      bgColor: 'from-green-500/20 to-green-600/20',
    },
    {
      label: 'Total Guilds',
      value: stats.totalGuilds,
      icon: Bot,
      color: 'text-purple-400',
      bgColor: 'from-purple-500/20 to-purple-600/20',
    },
    {
      label: 'Active Bots',
      value: stats.activeBots,
      icon: Activity,
      color: 'text-orange-400',
      bgColor: 'from-orange-500/20 to-orange-600/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card
          key={item.label}
          className="p-6 bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 mb-1">{item.label}</p>
              <p className="text-3xl font-bold text-white">
                {loading ? '...' : item.value.toLocaleString()}
              </p>
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${item.bgColor} backdrop-blur-sm`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
