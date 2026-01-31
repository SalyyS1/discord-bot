'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Crown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

interface UserManagementDataTableProps {
  users: User[];
  onView: (userId: string) => void;
  onUpgrade: (userId: string) => void;
}

export function UserManagementDataTable({ users, onView, onUpgrade }: UserManagementDataTableProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const getTierColor = (tier: string) => {
    return tier === 'PREMIUM' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400';
  };

  const handleUpgrade = async (userId: string) => {
    setLoading(userId);
    try {
      await onUpgrade(userId);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">User</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Tier</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Tenants</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Expires</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Joined</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-8 text-gray-400">
                No users found
              </td>
            </tr>
          ) : (
            users.map((user) => {
              const tier = user.subscription?.tier || 'FREE';
              const expiresAt = user.subscription?.expiresAt;
              const activeTenants = user.tenants.filter(t => t.status === 'ACTIVE').length;

              return (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-white">{user.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={getTierColor(tier)}>{tier}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-gray-300">
                      {user.tenants.length} total
                      {activeTenants > 0 && (
                        <span className="text-emerald-400 ml-1">({activeTenants} active)</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">
                    {expiresAt ? (
                      <span className={new Date(expiresAt) < new Date() ? 'text-red-400' : ''}>
                        {formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">
                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onView(user.id)}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpgrade(user.id)}
                        disabled={loading === user.id}
                        className="text-purple-400 hover:text-purple-300"
                      >
                        <Crown className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
