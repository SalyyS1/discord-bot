'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
// import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AutoResponder {
  id: string;
  trigger: string;
  triggerType: 'EXACT' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX';
  response: string;
  responseType: 'TEXT' | 'EMBED' | 'REACTION';
  cooldownSeconds: number;
  enabled: boolean;
}

const autoResponderSchema = z.object({
  trigger: z.string().min(1).max(100),
  triggerType: z.enum(['EXACT', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX']),
  response: z.string().min(1).max(2000),
  responseType: z.enum(['TEXT', 'EMBED', 'REACTION']),
  cooldownSeconds: z.number().int().min(0).max(3600),
  enabled: z.boolean(),
});

type AutoResponderFormData = z.infer<typeof autoResponderSchema>;

export default function AutoRespondersPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  // Translations ready for i18n
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoResponders, setAutoResponders] = useState<AutoResponder[]>([]);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<AutoResponderFormData>({
    resolver: zodResolver(autoResponderSchema),
    defaultValues: {
      triggerType: 'CONTAINS',
      responseType: 'TEXT',
      cooldownSeconds: 0,
      enabled: true,
    },
  });

  useEffect(() => {
    fetchAutoResponders();
  }, [guildId]);

  async function fetchAutoResponders() {
    try {
      const res = await fetch(`/api/guilds/${guildId}/autoresponders`);
      const { data } = await res.json();
      setAutoResponders(data || []);
    } catch {
      toast.error('Failed to load auto-responders');
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: AutoResponderFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/autoresponders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (res.ok) {
        toast.success('Auto-responder created');
        reset();
        setShowForm(false);
        fetchAutoResponders();
      } else {
        toast.error('Failed to create auto-responder');
      }
    } catch {
      toast.error('Failed to create auto-responder');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/autoresponders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      
      if (res.ok) {
        setAutoResponders((prev) =>
          prev.map((ar) => (ar.id === id ? { ...ar, enabled } : ar))
        );
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const deleteAutoResponder = async (id: string) => {
    if (!confirm('Delete this auto-responder?')) return;
    
    try {
      const res = await fetch(`/api/guilds/${guildId}/autoresponders/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast.success('Auto-responder deleted');
        setAutoResponders((prev) => prev.filter((ar) => ar.id !== id));
      }
    } catch {
      toast.error('Failed to delete');
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
          <MessageSquare className="h-8 w-8" />
          <div>
            <h2 className="text-2xl font-bold">Auto Responders</h2>
            <p className="text-muted-foreground">Automatic keyword responses</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Auto Responder</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trigger">Trigger</Label>
                  <Input
                    id="trigger"
                    placeholder="Enter trigger word/phrase"
                    {...register('trigger')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="triggerType">Trigger Type</Label>
                  <select
                    id="triggerType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...register('triggerType')}
                  >
                    <option value="CONTAINS">Contains</option>
                    <option value="EXACT">Exact Match</option>
                    <option value="STARTS_WITH">Starts With</option>
                    <option value="ENDS_WITH">Ends With</option>
                    <option value="REGEX">Regex</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="response">Response</Label>
                <Textarea
                  id="response"
                  placeholder="Enter response message"
                  {...register('response')}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="responseType">Response Type</Label>
                  <select
                    id="responseType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...register('responseType')}
                  >
                    <option value="TEXT">Text</option>
                    <option value="EMBED">Embed</option>
                    <option value="REACTION">Reaction</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cooldownSeconds">Cooldown (seconds)</Label>
                  <Input
                    id="cooldownSeconds"
                    type="number"
                    min={0}
                    max={3600}
                    {...register('cooldownSeconds', { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Switch
                  checked={watch('enabled')}
                  onCheckedChange={(checked) => setValue('enabled', checked)}
                />
                <span>Enabled</span>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Auto Responders ({autoResponders.length})</CardTitle>
          <CardDescription>Manage your keyword triggers</CardDescription>
        </CardHeader>
        <CardContent>
          {autoResponders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No auto-responders configured</p>
          ) : (
            <div className="space-y-3">
              {autoResponders.map((ar) => (
                <div
                  key={ar.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 text-sm">
                        {ar.trigger}
                      </code>
                      <span className="text-xs text-muted-foreground">
                        ({ar.triggerType})
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                      {ar.response}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ar.enabled}
                      onCheckedChange={(checked) => toggleEnabled(ar.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAutoResponder(ar.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
