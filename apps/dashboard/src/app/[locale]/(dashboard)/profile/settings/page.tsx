/**
 * Profile Settings Page
 * User notification preferences and account settings
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NotificationSettings } from '@/components/profile/user-notification-settings';

export default async function ProfileSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  // Fetch user preferences (if stored in DB)
  // For now, using default preferences
  const preferences = {
    emailNotifications: true,
    discordDMs: false,
    serverAlerts: true,
    weeklyDigest: false,
    securityAlerts: true,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account preferences and notification settings
        </p>
      </div>

      <NotificationSettings initialPreferences={preferences} />
    </div>
  );
}
