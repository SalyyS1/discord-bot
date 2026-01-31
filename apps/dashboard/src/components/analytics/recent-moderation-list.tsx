'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Ban, UserX, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ModerationAction {
  id: string;
  action: 'BAN' | 'KICK' | 'TIMEOUT' | 'WARN' | 'UNBAN' | 'PURGE' | 'MUTE' | 'UNMUTE';
  targetId: string;
  moderatorId: string;
  reason?: string | null;
  timestamp: string;
}

interface RecentModerationListProps {
  actions: ModerationAction[];
  loading?: boolean;
}

export function RecentModerationList({ actions, loading }: RecentModerationListProps) {
  if (loading) {
    return (
      <Card className="bg-surface-1 border-white/10">
        <CardHeader>
          <CardTitle>Recent Moderation</CardTitle>
          <CardDescription>Latest moderation actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!actions || actions.length === 0) {
    return (
      <Card className="bg-surface-1 border-white/10">
        <CardHeader>
          <CardTitle>Recent Moderation</CardTitle>
          <CardDescription>Latest moderation actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No moderation actions yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActionIcon = (action: ModerationAction['action']) => {
    switch (action) {
      case 'BAN':
        return <Ban className="w-4 h-4 text-red-400" />;
      case 'KICK':
        return <UserX className="w-4 h-4 text-orange-400" />;
      case 'TIMEOUT':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'WARN':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'UNBAN':
        return <ShieldCheck className="w-4 h-4 text-green-400" />;
      case 'MUTE':
        return <Shield className="w-4 h-4 text-purple-400" />;
      case 'UNMUTE':
        return <ShieldCheck className="w-4 h-4 text-blue-400" />;
      case 'PURGE':
        return <Shield className="w-4 h-4 text-pink-400" />;
      default:
        return <Shield className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionColor = (action: ModerationAction['action']) => {
    switch (action) {
      case 'BAN':
        return 'text-red-400';
      case 'KICK':
        return 'text-orange-400';
      case 'TIMEOUT':
        return 'text-yellow-400';
      case 'WARN':
        return 'text-amber-400';
      case 'UNBAN':
      case 'UNMUTE':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <Card className="bg-surface-1 border-white/10">
      <CardHeader>
        <CardTitle>Recent Moderation</CardTitle>
        <CardDescription>Latest moderation actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              {/* Action icon */}
              <div className="mt-0.5">{getActionIcon(action.action)}</div>

              {/* Action details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-medium ${getActionColor(action.action)}`}>
                    {action.action}
                  </span>
                  <span className="text-muted-foreground text-sm">•</span>
                  <span className="text-sm text-muted-foreground truncate">
                    User #{action.targetId.slice(-4)}
                  </span>
                </div>
                {action.reason && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {action.reason}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(action.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
