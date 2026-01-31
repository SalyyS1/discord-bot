'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import Link from 'next/link';

interface Tenant {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  _count: {
    users: number;
    guilds: number;
  };
}

export function TenantTable() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    async function loadTenants() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          search,
        });
        const response = await fetch(`/api/admin/tenants?${params}`);
        if (response.ok) {
          const data = await response.json();
          setTenants(data.tenants);
          setTotal(data.total);
        }
      } catch (error) {
        console.error('Failed to load tenants:', error);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadTenants, 300);
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
            placeholder="Search tenants..."
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
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Tenant</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Users</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Guilds</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Created</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-white/60">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-white/60">
                  Loading...
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-white/60">
                  No tenants found
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                        <Building2 className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{tenant.name}</p>
                        <p className="text-xs text-white/40 font-mono">{tenant.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={tenant.status === 'active' ? 'default' : 'secondary'}
                      className={tenant.status === 'active' ? 'bg-green-500' : ''}
                    >
                      {tenant.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-white">
                    {tenant._count.users}
                  </td>
                  <td className="py-3 px-4 text-sm text-white">
                    {tenant._count.guilds}
                  </td>
                  <td className="py-3 px-4 text-sm text-white/60">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/tenants/${tenant.id}`}>
                        View
                      </Link>
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
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} tenants
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
