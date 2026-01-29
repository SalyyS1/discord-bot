'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Shield } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogViewerProps {
  limit?: number;
}

export function AuditLogViewer({ limit = 10 }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const response = await fetch(`/api/admin/audit-logs?limit=${limit}`);
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs);
        }
      } catch (error) {
        console.error('Failed to load audit logs:', error);
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
    const interval = setInterval(loadLogs, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [limit]);

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-green-500/20 text-green-400 border-green-400/30';
    if (action.includes('delete')) return 'bg-red-500/20 text-red-400 border-red-400/30';
    if (action.includes('update')) return 'bg-blue-500/20 text-blue-400 border-blue-400/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
  };

  return (
    <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Audit Log
        </h3>
        <Badge variant="outline" className="text-xs">
          Last {limit} events
        </Badge>
      </div>

      {loading ? (
        <div className="text-center py-8 text-white/60">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-white/60">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
          <p>No audit logs found</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className={getActionColor(log.action)}>
                    {log.action}
                  </Badge>
                  <span className="text-xs text-white/40">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-white">
                    <span className="text-white/60">User:</span> {log.userEmail}
                  </p>
                  {log.ipAddress && (
                    <p className="text-sm text-white">
                      <span className="text-white/60">IP:</span>{' '}
                      <code className="text-xs bg-black/20 px-1 py-0.5 rounded">
                        {log.ipAddress}
                      </code>
                    </p>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-white/60 cursor-pointer hover:text-white/80">
                        View metadata
                      </summary>
                      <pre className="text-xs text-white/60 bg-black/20 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
