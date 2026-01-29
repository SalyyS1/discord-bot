'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Shield } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  timestamp: Date;
  metadata: unknown;
  ipAddress?: string | null;
}

interface TenantAuditLogViewerProps {
  logs: AuditLog[];
  title?: string;
}

export function TenantAuditLogViewer({ logs, title = 'Audit Logs' }: TenantAuditLogViewerProps) {
  const getActionColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('SUSPEND')) {
      return 'bg-red-500/20 text-red-400';
    }
    if (action.includes('CREATE') || action.includes('ACTIVATE')) {
      return 'bg-emerald-500/20 text-emerald-400';
    }
    if (action.includes('UPDATE') || action.includes('MODIFY')) {
      return 'bg-cyan-500/20 text-cyan-400';
    }
    return 'bg-gray-500/20 text-gray-400';
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <Card className="bg-[hsl(200_22%_16%)] border-[hsl(200_20%_25%)]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No audit logs found</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getActionColor(log.action)}>{formatAction(log.action)}</Badge>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    User: <span className="text-gray-300 font-mono">{log.userId.slice(0, 8)}...</span>
                  </div>
                  {log.ipAddress && (
                    <div className="text-xs text-gray-500 mt-1">IP: {log.ipAddress}</div>
                  )}
                  {(log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata as object).length > 0) ? (
                    <details className="mt-2">
                      <summary className="text-xs text-cyan-400 cursor-pointer hover:text-cyan-300">
                        View metadata
                      </summary>
                      <pre className="text-xs text-gray-400 mt-1 p-2 bg-black/30 rounded overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
