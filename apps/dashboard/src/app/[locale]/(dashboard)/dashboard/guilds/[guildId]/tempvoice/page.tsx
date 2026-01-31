'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Mic, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const tempVoiceSchema = z.object({
  creatorChannelId: z.string().min(1, 'Creator channel ID is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  defaultName: z.string().max(100).optional(),
  defaultLimit: z.number().int().min(0).max(99),
});

type TempVoiceFormData = z.infer<typeof tempVoiceSchema>;

export default function TempVoicePage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const t = useTranslations('common');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TempVoiceFormData>({
    resolver: zodResolver(tempVoiceSchema),
    defaultValues: {
      defaultName: "{user}'s Channel",
      defaultLimit: 0,
    },
  });

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/guilds/${guildId}/tempvoice`);
        const { data } = await res.json();
        if (data) {
          setHasConfig(true);
          setValue('creatorChannelId', data.creatorChannelId);
          setValue('categoryId', data.categoryId);
          setValue('defaultName', data.defaultName || "{user}'s Channel");
          setValue('defaultLimit', data.defaultLimit || 0);
        }
      } catch {
        toast.error('Failed to load config');
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [guildId, setValue]);

  const onSubmit = async (data: TempVoiceFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/tempvoice`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (res.ok) {
        setHasConfig(true);
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

  const deleteConfig = async () => {
    if (!confirm('Disable temporary voice channels?')) return;
    
    try {
      const res = await fetch(`/api/guilds/${guildId}/tempvoice`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setHasConfig(false);
        toast.success('Temp voice disabled');
      }
    } catch {
      toast.error('Failed to delete config');
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mic className="h-8 w-8" />
          <div>
            <h2 className="text-2xl font-bold">Temp Voice Channels</h2>
            <p className="text-muted-foreground">Join-to-create voice channels</p>
          </div>
        </div>
        {hasConfig && (
          <Button variant="destructive" onClick={deleteConfig}>
            <Trash2 className="mr-2 h-4 w-4" />
            Disable
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Set up the join-to-create voice channel system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="creatorChannelId">Creator Channel ID *</Label>
                <Input
                  id="creatorChannelId"
                  placeholder="Voice channel ID"
                  {...register('creatorChannelId')}
                />
                {errors.creatorChannelId && (
                  <p className="text-xs text-destructive">
                    {errors.creatorChannelId.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Users join this channel to create their own
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category ID *</Label>
                <Input
                  id="categoryId"
                  placeholder="Category ID for new channels"
                  {...register('categoryId')}
                />
                {errors.categoryId && (
                  <p className="text-xs text-destructive">
                    {errors.categoryId.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  New channels will be created in this category
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultName">Default Channel Name</Label>
                <Input
                  id="defaultName"
                  placeholder="{user}'s Channel"
                  {...register('defaultName')}
                />
                <p className="text-xs text-muted-foreground">
                  Variables: {'{user}'}, {'{game}'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLimit">Default User Limit</Label>
                <Input
                  id="defaultLimit"
                  type="number"
                  min={0}
                  max={99}
                  {...register('defaultLimit', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  0 = unlimited
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {hasConfig ? 'Update Settings' : 'Enable Temp Voice'}
        </Button>
      </form>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Users join the creator channel</p>
          <p>2. Bot creates a new voice channel for them</p>
          <p>3. User becomes owner and can manage the channel</p>
          <p>4. Channel is deleted when empty</p>
        </CardContent>
      </Card>
    </div>
  );
}
