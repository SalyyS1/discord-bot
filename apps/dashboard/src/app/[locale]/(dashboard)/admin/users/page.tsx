'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserManagementDataTable } from '@/components/admin/user-management-data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Search, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  subscription: {
    tier: 'FREE' | 'PREMIUM';
    expiresAt: string | null;
  } | null;
  tenants: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Upgrade dialog state
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [upgradeTier, setUpgradeTier] = useState<'FREE' | 'PREMIUM'>('PREMIUM');
  const [upgradeDuration, setUpgradeDuration] = useState('30');

  useEffect(() => {
    fetchUsers();
  }, [page]);

  async function fetchUsers() {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      });

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();

      if (data.success) {
        setUsers(data.data.users);
        setTotal(data.data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleView(userId: string) {
    router.push(`/admin/users/${userId}`);
  }

  function handleUpgrade(userId: string) {
    setSelectedUserId(userId);
    setUpgradeDialogOpen(true);
  }

  async function submitUpgrade() {
    if (!selectedUserId) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          tier: upgradeTier,
          durationDays: upgradeTier === 'PREMIUM' ? parseInt(upgradeDuration) : undefined,
        }),
      });

      if (res.ok) {
        await fetchUsers();
        setUpgradeDialogOpen(false);
        setSelectedUserId(null);
      }
    } catch (err) {
      console.error('Failed to upgrade user:', err);
    }
  }

  function handleSearch() {
    setPage(1);
    fetchUsers();
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
            <Users className="h-5 w-5 text-cyan-400" />
            User Management ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-white/5 border-white/10"
              />
            </div>
            <Button onClick={handleSearch} className="bg-cyan-500 hover:bg-cyan-600">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
        <CardContent className="p-0">
          <UserManagementDataTable
            users={users}
            onView={handleView}
            onUpgrade={handleUpgrade}
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

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-400" />
              Upgrade User Subscription
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Modify user subscription tier and duration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Tier</label>
              <Select value={upgradeTier} onValueChange={(v: 'FREE' | 'PREMIUM') => setUpgradeTier(v)}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PREMIUM">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {upgradeTier === 'PREMIUM' && (
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Duration</label>
                <Select value={upgradeDuration} onValueChange={setUpgradeDuration}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">365 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitUpgrade} className="bg-purple-500 hover:bg-purple-600">
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
