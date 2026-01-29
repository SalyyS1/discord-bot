/**
 * Profile Data & Privacy Page
 * GDPR compliance - data export and account deletion
 */

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { DangerZone } from '@/components/profile/account-danger-zone';

export default async function ProfileDataPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Data & Privacy</h2>
        <p className="text-muted-foreground">
          Manage your personal data and privacy settings
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Your Rights</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            In accordance with GDPR and data protection regulations, you have the
            right to:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Access your personal data</li>
            <li>Rectify inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data in a portable format</li>
            <li>Object to processing of your data</li>
          </ul>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Data We Collect</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Account Information:</strong> Discord ID, username, email, avatar</p>
          <p><strong>Usage Data:</strong> Server configurations, command usage, settings</p>
          <p><strong>Session Data:</strong> IP addresses, device information, login times</p>
          <p><strong>Communication:</strong> Support tickets, feedback submissions</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Data Retention</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            We retain your data for as long as your account is active. You can
            request deletion at any time using the controls below.
          </p>
          <p>
            Some data may be retained for legal compliance or security purposes
            for up to 90 days after account deletion.
          </p>
        </div>
      </div>

      <DangerZone />
    </div>
  );
}
