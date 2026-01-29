'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: string;
  _count: {
    tenantMemberships: number;
    sessions: number;
  };
}

export function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          search,
        });
        const response = await fetch(`/api/admin/users?${params}`);
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
          setTotal(data.total);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadUsers, 300);
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
            placeholder="Search users..."
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
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">User</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Email</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Tenants</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Sessions</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-white/60">Joined</th>
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-white/60">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name || 'User'}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                          {user.name?.[0] || user.email?.[0] || '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">
                          {user.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-white/40 font-mono">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-white/80">
                    {user.email || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="text-xs">
                      {user._count.tenantMemberships}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {user._count.sessions > 0 ? (
                      <Badge variant="default" className="text-xs bg-green-500">
                        {user._count.sessions} Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-white/60">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/users/${user.id}`}>
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
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} users
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
