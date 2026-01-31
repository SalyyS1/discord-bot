'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Server } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Guild {
  id: string;
  name: string;
  tenantId: string | null;
  joinedAt: string;
  leftAt: string | null;
  memberCount?: number;
}

export default function AdminGuildsPage() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, left: 0 });

  useEffect(() => {
    fetchGuilds();
  }, []);

  async function fetchGuilds() {
    try {
      // Mock data - in production, fetch from database
      const mockGuilds: Guild[] = [
        {
          id: '123456789',
          name: 'Discord Server 1',
          tenantId: 'tenant_1',
          joinedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          leftAt: null,
          memberCount: 1250,
        },
        {
          id: '987654321',
          name: 'Discord Server 2',
          tenantId: 'tenant_2',
          joinedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
          leftAt: null,
          memberCount: 850,
        },
      ];

      setGuilds(mockGuilds);
      setStats({
        total: mockGuilds.length,
        active: mockGuilds.filter(g => !g.leftAt).length,
        left: mockGuilds.filter(g => g.leftAt).length,
      });
    } catch (err) {
      console.error('Failed to fetch guilds:', err);
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

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-gray-400">Total Guilds</div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-400">{stats.active}</div>
            <div className="text-sm text-gray-400">Active Guilds</div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-400">{stats.left}</div>
            <div className="text-sm text-gray-400">Left Guilds</div>
          </CardContent>
        </Card>
      </div>

      {/* Guild List */}
      <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-400" />
            All Guilds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Guild</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Tenant</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Members</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Joined</th>
                </tr>
              </thead>
              <tbody>
                {guilds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      No guilds found
                    </td>
                  </tr>
                ) : (
                  guilds.map((guild) => (
                    <tr key={guild.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{guild.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{guild.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        {guild.tenantId ? (
                          <span className="text-gray-300 font-mono text-sm">
                            {guild.tenantId.slice(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {guild.memberCount?.toLocaleString() || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {guild.leftAt ? (
                          <Badge className="bg-red-500/20 text-red-400">Left</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-400">Active</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {formatDistanceToNow(new Date(guild.joinedAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
