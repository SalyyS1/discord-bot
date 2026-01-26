'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
// import { useTranslations } from 'next-intl';
import { Loader2, Gift, Trophy, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Giveaway {
  id: string;
  prize: string;
  winnerCount: number;
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED';
  endsAt: string;
  createdAt: string;
}

export default function GiveawaysPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  // const t = useTranslations('common');
  const [loading, setLoading] = useState(true);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);

  useEffect(() => {
    async function fetchGiveaways() {
      try {
        const res = await fetch(`/api/guilds/${guildId}/giveaways`);
        const { data } = await res.json();
        setGiveaways(data || []);
      } catch {
        toast.error('Failed to load giveaways');
      } finally {
        setLoading(false);
      }
    }
    fetchGiveaways();
  }, [guildId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const activeGiveaways = giveaways.filter((g) => g.status === 'ACTIVE');
  const endedGiveaways = giveaways.filter((g) => g.status === 'ENDED');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gift className="h-8 w-8" />
        <div>
          <h2 className="text-2xl font-bold">Giveaways</h2>
          <p className="text-muted-foreground">Manage server giveaways</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGiveaways.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ended</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{endedGiveaways.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{giveaways.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Giveaways */}
      <Card>
        <CardHeader>
          <CardTitle>Active Giveaways</CardTitle>
          <CardDescription>Currently running giveaways</CardDescription>
        </CardHeader>
        <CardContent>
          {activeGiveaways.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active giveaways</p>
          ) : (
            <div className="space-y-4">
              {activeGiveaways.map((giveaway) => (
                <div
                  key={giveaway.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{giveaway.prize}</p>
                    <p className="text-sm text-muted-foreground">
                      {giveaway.winnerCount} winner(s) • Ends{' '}
                      {new Date(giveaway.endsAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Ended Giveaways */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Giveaways</CardTitle>
          <CardDescription>Recently ended giveaways</CardDescription>
        </CardHeader>
        <CardContent>
          {endedGiveaways.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ended giveaways</p>
          ) : (
            <div className="space-y-4">
              {endedGiveaways.slice(0, 5).map((giveaway) => (
                <div
                  key={giveaway.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{giveaway.prize}</p>
                    <p className="text-sm text-muted-foreground">
                      {giveaway.winnerCount} winner(s) • Ended{' '}
                      {new Date(giveaway.endsAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-500/10 px-2 py-1 text-xs text-gray-500">
                    Ended
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
