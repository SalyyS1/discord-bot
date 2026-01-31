'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TenantDataTable } from '@/components/admin/tenant-management-data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Server, Search } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ERROR';
  tier: 'FREE' | 'PRO' | 'ULTRA';
  isRunning: boolean;
  currentGuilds: number;
  createdAt: string;
  user: {
    email: string;
    name: string | null;
  };
}

export default function AdminTenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchTenants();
  }, [page, statusFilter]);

  async function fetchTenants() {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await fetch(`/api/admin/tenants?${params}`);
      const data = await res.json();

      if (data.success) {
        setTenants(data.data.tenants);
        setTotal(data.data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(tenantId: string, status: string) {
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, status }),
      });

      if (res.ok) {
        await fetchTenants();
      }
    } catch (err) {
      console.error('Failed to update tenant:', err);
    }
  }

  async function handleDelete(tenantId: string) {
    if (!confirm('Are you sure? This will permanently delete the tenant and all associated data.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/tenants?id=${tenantId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchTenants();
      }
    } catch (err) {
      console.error('Failed to delete tenant:', err);
    }
  }

  function handleView(tenantId: string) {
    router.push(`/admin/tenants/${tenantId}`);
  }

  function handleSearch() {
    setPage(1);
    fetchTenants();
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
      {/* Filters */}
      <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-400" />
            Tenant Management ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name, email, or bot username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-white/5 border-white/10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} className="bg-cyan-500 hover:bg-cyan-600">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Table */}
      <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
        <CardContent className="p-0">
          <TenantDataTable
            tenants={tenants}
            onView={handleView}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="bg-white/5 border-white/10"
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-gray-400">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="bg-white/5 border-white/10"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
