'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const levelingSchema = z.object({
  levelingEnabled: z.boolean(),
  xpMin: z.number().int().min(1).max(100),
  xpMax: z.number().int().min(1).max(100),
  xpCooldownSeconds: z.number().int().min(10).max(300),
});

type LevelingFormData = z.infer<typeof levelingSchema>;

export default function LevelingSettingsPage() {
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
  } = useForm<LevelingFormData>({
    resolver: zodResolver(levelingSchema),
    defaultValues: {
      levelingEnabled: true,
      xpMin: 15,
      xpMax: 25,
      xpCooldownSeconds: 60,
    },
  });

  const enabled = watch('levelingEnabled');

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/guilds/${guildId}/leveling`);
        const { data } = await res.json();
        if (data) {
          setValue('levelingEnabled', data.levelingEnabled ?? true);
          setValue('xpMin', data.xpMin || 15);
          setValue('xpMax', data.xpMax || 25);
          setValue('xpCooldownSeconds', data.xpCooldownSeconds || 60);
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [guildId, setValue]);

  const onSubmit = async (data: LevelingFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/leveling`, {
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
        <Zap className="h-8 w-8" />
        <div>
          <h2 className="text-2xl font-bold">Leveling System</h2>
          <p className="text-muted-foreground">Configure XP and leveling settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Enable/Disable */}
        <Card>
          <CardHeader>
            <CardTitle>Enable Leveling</CardTitle>
            <CardDescription>
              Members earn XP for sending messages and level up
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => setValue('levelingEnabled', checked)}
              />
              <span>{enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </CardContent>
        </Card>

        {enabled && (
          <Card>
            <CardHeader>
              <CardTitle>XP Settings</CardTitle>
              <CardDescription>
                Configure how much XP members earn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="xpMin">Min XP per Message</Label>
                  <Input
                    id="xpMin"
                    type="number"
                    min={1}
                    max={100}
                    {...register('xpMin', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xpMax">Max XP per Message</Label>
                  <Input
                    id="xpMax"
                    type="number"
                    min={1}
                    max={100}
                    {...register('xpMax', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xpCooldownSeconds">Cooldown (seconds)</Label>
                  <Input
                    id="xpCooldownSeconds"
                    type="number"
                    min={10}
                    max={300}
                    {...register('xpCooldownSeconds', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
