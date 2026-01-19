'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const welcomeSchema = z.object({
  welcomeChannelId: z.string().optional(),
  welcomeMessage: z.string().max(2000).optional(),
  welcomeImageEnabled: z.boolean(),
  goodbyeChannelId: z.string().optional(),
  goodbyeMessage: z.string().max(2000).optional(),
  goodbyeImageEnabled: z.boolean(),
});

type WelcomeFormData = z.infer<typeof welcomeSchema>;

export default function WelcomeSettingsPage() {
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
  } = useForm<WelcomeFormData>({
    resolver: zodResolver(welcomeSchema),
    defaultValues: {
      welcomeImageEnabled: false,
      goodbyeImageEnabled: false,
    },
  });

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/guilds/${guildId}/welcome`);
        const { data } = await res.json();
        if (data) {
          setValue('welcomeChannelId', data.welcomeChannelId || '');
          setValue('welcomeMessage', data.welcomeMessage || '');
          setValue('welcomeImageEnabled', data.welcomeImageEnabled || false);
          setValue('goodbyeChannelId', data.goodbyeChannelId || '');
          setValue('goodbyeMessage', data.goodbyeMessage || '');
          setValue('goodbyeImageEnabled', data.goodbyeImageEnabled || false);
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [guildId, setValue]);

  const onSubmit = async (data: WelcomeFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/welcome`, {
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
        <Bell className="h-8 w-8" />
        <div>
          <h2 className="text-2xl font-bold">Welcome & Goodbye</h2>
          <p className="text-muted-foreground">Configure welcome and goodbye messages</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Welcome Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome Messages</CardTitle>
            <CardDescription>
              Send a message when new members join
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="welcomeChannelId">Channel ID</Label>
              <Input
                id="welcomeChannelId"
                placeholder="Enter channel ID"
                {...register('welcomeChannelId')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Welcome Message</Label>
              <Textarea
                id="welcomeMessage"
                placeholder="Welcome {{user}} to {{server}}!"
                {...register('welcomeMessage')}
              />
              <p className="text-xs text-muted-foreground">
                Variables: {'{{user}}'}, {'{{server}}'}, {'{{memberCount}}'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Switch
                checked={watch('welcomeImageEnabled')}
                onCheckedChange={(checked) => setValue('welcomeImageEnabled', checked)}
              />
              <span>Enable Welcome Image</span>
            </div>
          </CardContent>
        </Card>

        {/* Goodbye Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Goodbye Messages</CardTitle>
            <CardDescription>
              Send a message when members leave
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goodbyeChannelId">Channel ID</Label>
              <Input
                id="goodbyeChannelId"
                placeholder="Enter channel ID"
                {...register('goodbyeChannelId')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goodbyeMessage">Goodbye Message</Label>
              <Textarea
                id="goodbyeMessage"
                placeholder="Goodbye {{user}}!"
                {...register('goodbyeMessage')}
              />
            </div>
            <div className="flex items-center gap-4">
              <Switch
                checked={watch('goodbyeImageEnabled')}
                onCheckedChange={(checked) => setValue('goodbyeImageEnabled', checked)}
              />
              <span>Enable Goodbye Image</span>
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
