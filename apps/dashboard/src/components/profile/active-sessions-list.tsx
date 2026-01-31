/**
 * Sessions List Component
 * Displays active user sessions with revoke functionality
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Session {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface SessionsListProps {
  sessions: Session[];
  currentSessionId?: string;
}

export function SessionsList({ sessions, currentSessionId }: SessionsListProps) {
  const router = useRouter();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const getDeviceIcon = (userAgent?: string | null) => {
    if (!userAgent) return Monitor;
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
    return isMobile ? Smartphone : Monitor;
  };

  const getDeviceName = (userAgent?: string | null) => {
    if (!userAgent) return 'Unknown Device';

    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('Edge')) return 'Edge Browser';

    return 'Unknown Browser';
  };

  const handleRevoke = async (sessionId: string) => {
    if (sessionId === currentSessionId) return;

    setRevokingId(sessionId);

    try {
      const response = await fetch(`/api/user/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke session');
      }

      router.refresh();
    } catch (error) {
      console.error('Error revoking session:', error);
      alert('Failed to revoke session. Please try again.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>
          Manage devices where you're currently logged in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No active sessions</p>
          </div>
        ) : (
          sessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.userAgent);
            const deviceName = getDeviceName(session.userAgent);
            const isCurrentSession = session.id === currentSessionId;

            return (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <DeviceIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{deviceName}</p>
                      {isCurrentSession && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {session.ipAddress || 'Unknown IP'} • Last active:{' '}
                      {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires: {new Date(session.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isCurrentSession || revokingId === session.id}
                  onClick={() => handleRevoke(session.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}

        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <p>
            Sessions expire automatically after a period of inactivity. You can
            manually revoke sessions if you notice suspicious activity.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
