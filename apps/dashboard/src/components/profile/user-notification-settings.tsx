/**
 * Notification Settings Component
 * Manages user notification preferences
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface NotificationPreferences {
  emailNotifications: boolean;
  discordDMs: boolean;
  serverAlerts: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
}

interface NotificationSettingsProps {
  initialPreferences: NotificationPreferences;
}

export function NotificationSettings({ initialPreferences }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: preferences }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      alert('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive important updates via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.emailNotifications}
              onCheckedChange={() => handleToggle('emailNotifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="discord-dms">Discord Direct Messages</Label>
              <p className="text-sm text-muted-foreground">
                Get notified via Discord DMs
              </p>
            </div>
            <Switch
              id="discord-dms"
              checked={preferences.discordDMs}
              onCheckedChange={() => handleToggle('discordDMs')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="server-alerts">Server Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Critical server events and errors
              </p>
            </div>
            <Switch
              id="server-alerts"
              checked={preferences.serverAlerts}
              onCheckedChange={() => handleToggle('serverAlerts')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-digest">Weekly Digest</Label>
              <p className="text-sm text-muted-foreground">
                Summary of activity and insights
              </p>
            </div>
            <Switch
              id="weekly-digest"
              checked={preferences.weeklyDigest}
              onCheckedChange={() => handleToggle('weeklyDigest')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="security-alerts">Security Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Important security notifications (always recommended)
              </p>
            </div>
            <Switch
              id="security-alerts"
              checked={preferences.securityAlerts}
              onCheckedChange={() => handleToggle('securityAlerts')}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
