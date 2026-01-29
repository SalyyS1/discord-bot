'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight, Bot } from 'lucide-react';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number | null;
  tenantId: string;
  tenant: {
    name: string;
  };
  createdAt: string;
}

export function GuildTable() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    async function loadGuilds() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          search,
        });
        const response = await fetch(`/api/admin/guilds?${params}`);
        if (response.ok) {
          const data = await response.json();
          setGuilds(data.guilds);
          setTotal(data.total);
        }
      } catch (error) {
        console.error('Failed to load guilds:', error);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadGuilds, 300);
    return () => clearTimeout(timer);
  }, [page, search]);

  const totalPages = Math.ceil(total / limit);

  return (
    <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            type="text"
            placeholder="Search guilds..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Guild</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Tenant</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Members</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Added</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-white/60">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-white/60">
                  Loading...
                </td>
              </tr>
            ) : guilds.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-white/60">
                  No guilds found
                </td>
              </tr>
            ) : (
              guilds.map((guild) => (
                <tr
                  key={guild.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {guild.icon ? (
                        <img
                          src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                          alt={guild.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">{guild.name}</p>
                        <p className="text-xs text-white/40 font-mono">{guild.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="text-xs">
                      {guild.tenant.name}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-white">
                    {guild.memberCount?.toLocaleString() || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-white/60">
                    {new Date(guild.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
          <p className="text-sm text-white/60">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} guilds
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-white px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
