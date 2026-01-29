'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, PlayCircle, StopCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

interface TenantDataTableProps {
  tenants: Tenant[];
  onView: (tenantId: string) => void;
  onUpdateStatus: (tenantId: string, status: string) => void;
  onDelete: (tenantId: string) => void;
}

export function TenantDataTable({ tenants, onView, onUpdateStatus, onDelete }: TenantDataTableProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'SUSPENDED':
        return 'bg-red-500/20 text-red-400';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'ERROR':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ULTRA':
        return 'bg-purple-500/20 text-purple-400';
      case 'PRO':
        return 'bg-cyan-500/20 text-cyan-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleAction = async (action: () => Promise<void>, tenantId: string) => {
    setLoading(tenantId);
    try {
      await action();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Tenant</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Owner</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Tier</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Guilds</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Created</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tenants.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-8 text-gray-400">
                No tenants found
              </td>
            </tr>
          ) : (
            tenants.map((tenant) => (
              <tr key={tenant.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium text-white">{tenant.name}</div>
                    {tenant.isRunning && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-emerald-400">Running</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm text-gray-300">{tenant.user.name || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{tenant.user.email}</div>
                </td>
                <td className="py-3 px-4">
                  <Badge className={getStatusColor(tenant.status)}>{tenant.status}</Badge>
                </td>
                <td className="py-3 px-4">
                  <Badge className={getTierColor(tenant.tier)}>{tenant.tier}</Badge>
                </td>
                <td className="py-3 px-4 text-gray-300">{tenant.currentGuilds}</td>
                <td className="py-3 px-4 text-sm text-gray-400">
                  {formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true })}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onView(tenant.id)}
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {tenant.status === 'SUSPENDED' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAction(() => onUpdateStatus(tenant.id, 'ACTIVE'), tenant.id)}
                        disabled={loading === tenant.id}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAction(() => onUpdateStatus(tenant.id, 'SUSPENDED'), tenant.id)}
                        disabled={loading === tenant.id}
                        className="text-orange-400 hover:text-orange-300"
                      >
                        <StopCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(() => onDelete(tenant.id), tenant.id)}
                      disabled={loading === tenant.id}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
