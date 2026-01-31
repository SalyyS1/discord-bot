'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Ticket, FolderOpen, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealtimeTickets } from '@/hooks/use-realtime-tickets';

interface TicketData {
  id: string;
  channelId: string;
  category: string;
  subject: string | null;
  status: 'OPEN' | 'CLAIMED' | 'CLOSED';
  createdAt: string;
}

const ticketSettingsSchema = z.object({
  ticketCategoryId: z.string().optional(),
});

type TicketSettingsFormData = z.infer<typeof ticketSettingsSchema>;

export default function TicketsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const t = useTranslations('common');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    data: ticketsData,
    isLoading: ticketsLoading,
  } = useRealtimeTickets(guildId, {
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const tickets = ticketsData?.tickets ?? [];

  const {
    register,
    handleSubmit,
    setValue,
  } = useForm<TicketSettingsFormData>({
    resolver: zodResolver(ticketSettingsSchema),
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const settingsRes = await fetch(`/api/guilds/${guildId}/tickets?type=settings`);
        const settings = await settingsRes.json();

        if (settings.data) {
          setValue('ticketCategoryId', settings.data.ticketCategoryId || '');
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [guildId, setValue]);

  const onSubmit = async (data: TicketSettingsFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets`, {
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

  if (loading || ticketsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const openTickets = tickets.filter((t) => t.status === 'OPEN');
  const closedTickets = tickets.filter((t) => t.status === 'CLOSED');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Ticket className="h-8 w-8" />
        <div>
          <h2 className="text-2xl font-bold">Ticket System</h2>
          <p className="text-muted-foreground">Manage support tickets</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTickets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedTickets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tickets.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Ticket Settings</CardTitle>
            <CardDescription>Configure the ticket system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ticketCategoryId">Ticket Category ID</Label>
              <Input
                id="ticketCategoryId"
                placeholder="Enter category ID for ticket channels"
                {...register('ticketCategoryId')}
              />
              <p className="text-xs text-muted-foreground">
                Tickets will be created under this category
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {t('save')}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Open Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Open Tickets</CardTitle>
          <CardDescription>Currently active tickets</CardDescription>
        </CardHeader>
        <CardContent>
          {openTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tickets</p>
          ) : (
            <div className="space-y-2">
              {openTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">Ticket #{ticket.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      User: {ticket.member.discordId} • {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-500">
                    {ticket.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
