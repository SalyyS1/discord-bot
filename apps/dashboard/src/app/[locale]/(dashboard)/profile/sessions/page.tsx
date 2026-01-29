/**
 * Profile Sessions Page
 * Displays and manages active user sessions
 */

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { SessionsList } from '@/components/profile/active-sessions-list';

export default async function ProfileSessionsPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  // Fetch all active sessions for user
  const sessions = await prisma.session.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      ipAddress: true,
      userAgent: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Active Sessions</h2>
        <p className="text-muted-foreground">
          Manage devices where you're currently logged in
        </p>
      </div>

      <SessionsList
        sessions={sessions}
        currentSessionId={session.session?.id}
      />

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Security Tips</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Review active sessions regularly for suspicious activity</li>
          <li>• Revoke sessions from devices you no longer use</li>
          <li>• Sessions expire automatically after extended inactivity</li>
          <li>• Contact support if you notice unauthorized access</li>
        </ul>
      </div>
    </div>
  );
}
