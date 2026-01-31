'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const moderationSchema = z.object({
  antiSpamEnabled: z.boolean(),
  antiSpamThreshold: z.number().int().min(3).max(20),
  antiSpamInterval: z.number().int().min(1000).max(60000),
  antiLinkEnabled: z.boolean(),
});

type ModerationFormData = z.infer<typeof moderationSchema>;

export default function ModerationSettingsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const t = useTranslations('common');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
  } = useForm<ModerationFormData>({
    resolver: zodResolver(moderationSchema),
    defaultValues: {
      antiSpamEnabled: false,
      antiSpamThreshold: 5,
      antiSpamInterval: 5000,
      antiLinkEnabled: false,
    },
  });

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/guilds/${guildId}/moderation`);
        const { data } = await res.json();
        if (data) {
          setValue('antiSpamEnabled', data.antiSpamEnabled || false);
          setValue('antiSpamThreshold', data.antiSpamThreshold || 5);
          setValue('antiSpamInterval', data.antiSpamInterval || 5000);
          setValue('antiLinkEnabled', data.antiLinkEnabled || false);
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [guildId, setValue]);

  const onSubmit = async (data: ModerationFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/moderation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (res.ok) {
        toast.success(t('save') + ' successful');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8" />
        <div>
          <h2 className="text-2xl font-bold">Moderation Settings</h2>
          <p className="text-muted-foreground">Configure auto-moderation features</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Anti-Spam */}
        <Card>
          <CardHeader>
            <CardTitle>Anti-Spam</CardTitle>
            <CardDescription>
              Automatically detect and handle spam messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Switch
                checked={watch('antiSpamEnabled')}
                onCheckedChange={(checked) => setValue('antiSpamEnabled', checked)}
              />
              <span>{watch('antiSpamEnabled') ? 'Enabled' : 'Disabled'}</span>
            </div>

            {watch('antiSpamEnabled') && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="threshold">Message Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min={3}
                    max={20}
                    {...register('antiSpamThreshold', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of messages before action
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Time Window (ms)</Label>
                  <Input
                    id="interval"
                    type="number"
                    min={1000}
                    max={60000}
                    {...register('antiSpamInterval', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Time window to count messages
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anti-Link */}
        <Card>
          <CardHeader>
            <CardTitle>Anti-Link</CardTitle>
            <CardDescription>
              Automatically detect and remove links
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Switch
                checked={watch('antiLinkEnabled')}
                onCheckedChange={(checked) => setValue('antiLinkEnabled', checked)}
              />
              <span>{watch('antiLinkEnabled') ? 'Enabled' : 'Disabled'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {t('save')}
        </Button>
      </form>
    </div>
  );
}
