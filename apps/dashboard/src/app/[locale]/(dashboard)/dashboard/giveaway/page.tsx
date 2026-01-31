'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Gift, History, Server, Save, ChevronRight, Palette, MousePointer2,
  Sparkles, PartyPopper, Clock, Plus, Trash2, Users, Shield, Crown, Trophy, Medal,
  Star, Zap, Calendar, Bell, Settings2, Play, Pause,
  RotateCcw, Check, X, AlertTriangle, Percent, Hash,
  CalendarClock, Layers, FileText, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EmbedEditor } from '@/components/editors/embed-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSelectedGuild } from '@/hooks/use-selected-guild';
import { useGuildContext } from '@/context/guild-context';
import { useUpdateGiveawaySettings } from '@/hooks/use-mutations';
import { useRealtimeGiveaways, useInvalidateGiveaways } from '@/hooks/use-realtime-giveaways';
import { ChannelSelector, Channel } from '@/components/selectors/channel-selector';
import { RoleSelector } from '@/components/selectors/role-selector';

interface PrizeTier {
  place: number;
  prize: string;
  count: number;
}

interface BonusEntryRole {
  roleId: string;
  roleName?: string;
  entries: number;
}

interface Giveaway {
  id: string;
  prize: string;
  description?: string;
  channelId: string;
  hostId: string;
  winnerCount: number;
  status: 'PENDING' | 'ACTIVE' | 'ENDED' | 'CANCELLED' | 'PAUSED';
  entries: number;
  startsAt?: string;
  endsAt: string;
  endedAt?: string;
  createdAt: string;
  requiredRoleIds: string[];
  requiredLevel: number;
  requiredMessages: number;
  embedColor: string;
  buttonText: string;
  prizeTiers?: PrizeTier[];
  bonusEntryRoles?: BonusEntryRole[];
  boosterBonusEntries: number;
  dmWinners: boolean;
}

interface GuildStats {
  activeGiveaways: number;
  totalGiveaways: number;
  totalEntries: number;
  completedGiveaways: number;
  averageEntries: number;
}

const STATUS_COLORS = {
  PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ENDED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
  PAUSED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const STATUS_ICONS = {
  PENDING: CalendarClock,
  ACTIVE: Play,
  ENDED: Check,
  CANCELLED: X,
  PAUSED: Pause,
};

export default function GiveawayPage() {
  const { guildId, guilds, loading: guildsLoading } = useSelectedGuild();
  const { setSelectedGuildId } = useGuildContext();
  const [dataLoading, setDataLoading] = useState(false);
  const loading = guildsLoading || dataLoading;
  const [activeTab, setActiveTab] = useState('overview');
  const updateGiveawaySettings = useUpdateGiveawaySettings(guildId);
  const invalidateGiveaways = useInvalidateGiveaways();

  // Realtime giveaways with polling (15s interval for near-realtime updates)
  const {
    data: giveawaysData,
    isLoading: giveawaysLoading,
  } = useRealtimeGiveaways(guildId, {
    refetchInterval: 15000,
  });

  // Guild data
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string; color: number }>>([]);

  // Giveaways - now primarily from realtime hook
  const giveaways = (giveawaysData?.giveaways ?? []) as unknown as Giveaway[];
  const stats: GuildStats = {
    activeGiveaways: giveaways.filter((g) => g.status === 'ACTIVE').length,
    totalGiveaways: giveaways.length,
    totalEntries: giveaways.reduce((sum, g) => sum + g.entries, 0),
    completedGiveaways: giveaways.filter((g) => g.status === 'ENDED').length,
    averageEntries: giveaways.length > 0
      ? Math.round(giveaways.reduce((sum, g) => sum + g.entries, 0) / giveaways.length)
      : 0,
  };

  // Settings
  const [settings, setSettings] = useState({
    giveawayButtonText: '🎉 Enter Giveaway',
    giveawayButtonEmoji: '🎉',
    giveawayImageUrl: '',
    giveawayColor: '#14b8a6',
    defaultDuration: 86400,
    dmWinners: true,
    dmWinnerMessage: 'Congratulations! You won **{prize}** in **{server}**! 🎉',
    autoReroll: false,
    winnerClaimTimeout: 24,
    pingOnEnd: true,
  });

  // Create Giveaway Dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGiveaway, setNewGiveaway] = useState({
    prize: '',
    description: '',
    channelId: '',
    winnerCount: 1,
    duration: 86400,
    scheduleStart: false,
    startsAt: '',
    embedColor: '#14b8a6',
    buttonText: '🎉 Enter Giveaway',
    imageUrl: '',
    // Requirements
    requiredRoleIds: [] as string[],
    blacklistRoleIds: [] as string[],
    requiredLevel: 0,
    requiredMessages: 0,
    requiredAccountAge: 0,
    requiredServerAge: 0,
    // Bonus Entries
    bonusEntryRoles: [] as BonusEntryRole[],
    boosterBonusEntries: 0,
    // Prize Tiers
    usePrizeTiers: false,
    prizeTiers: [{ place: 1, prize: '', count: 1 }] as PrizeTier[],
    // Winner Settings
    dmWinners: true,
    dmWinnerMessage: '',
    autoReroll: false,
    pingRoleId: '',
  });

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch guild data (channels, roles, settings - giveaways handled by useRealtimeGiveaways)
  const fetchGuildData = useCallback(async () => {
    if (!guildId) return;
    setDataLoading(true);
    try {
      const [channelsRes, rolesRes, settingsRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/channels`),
        fetch(`/api/guilds/${guildId}/roles`),
        fetch(`/api/guilds/${guildId}/giveaways/settings`),
      ]);

      if (channelsRes.ok) {
        const { data } = await channelsRes.json();
        // Filter for text channels only and cast type
        const textChannels = (data || []).filter((c: { type: string }) => c.type === 'text').map((c: { id: string; name: string; type: string; parentId?: string; parentName?: string }) => ({
          ...c,
          type: c.type as Channel['type']
        }));
        setChannels(textChannels);
      }

      if (rolesRes.ok) {
        const { data } = await rolesRes.json();
        setRoles(data || []);
      }

      if (settingsRes.ok) {
        const { data } = await settingsRes.json();
        if (data) {
          setSettings(prev => ({
            ...prev,
            giveawayButtonText: data.giveawayButtonText || prev.giveawayButtonText,
            giveawayButtonEmoji: data.giveawayButtonEmoji || prev.giveawayButtonEmoji,
            giveawayImageUrl: data.giveawayImageUrl || '',
            giveawayColor: data.giveawayColor || prev.giveawayColor,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch guild data:', error);
    } finally {
      setDataLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    fetchGuildData();
  }, [fetchGuildData]);

  const handleSaveSettings = () => {
    updateGiveawaySettings.mutate(settings);
  };

  const handleCreateGiveaway = async () => {
    if (!guildId || !newGiveaway.prize || !newGiveaway.channelId) {
      toast.error('Please fill in required fields');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        ...newGiveaway,
        duration: newGiveaway.duration,
        prizeTiers: newGiveaway.usePrizeTiers ? newGiveaway.prizeTiers : undefined,
      };

      const res = await fetch(`/api/guilds/${guildId}/giveaways`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('Giveaway created successfully!');
        setShowCreateDialog(false);
        setNewGiveaway({
          prize: '',
          description: '',
          channelId: '',
          winnerCount: 1,
          duration: 86400,
          scheduleStart: false,
          startsAt: '',
          embedColor: '#14b8a6',
          buttonText: '🎉 Enter Giveaway',
          imageUrl: '',
          requiredRoleIds: [],
          blacklistRoleIds: [],
          requiredLevel: 0,
          requiredMessages: 0,
          requiredAccountAge: 0,
          requiredServerAge: 0,
          bonusEntryRoles: [],
          boosterBonusEntries: 0,
          usePrizeTiers: false,
          prizeTiers: [{ place: 1, prize: '', count: 1 }],
          dmWinners: true,
          dmWinnerMessage: '',
          autoReroll: false,
          pingRoleId: '',
        });
        invalidateGiveaways(guildId);
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to create giveaway');
      }
    } catch {
      toast.error('Failed to create giveaway');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGiveaway = async () => {
    if (!guildId || !deleteId) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/giveaways/${deleteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Giveaway deleted');
        invalidateGiveaways(guildId);
      } else {
        toast.error('Failed to delete giveaway');
      }
    } catch {
      toast.error('Failed to delete giveaway');
    } finally {
      setDeleteId(null);
    }
  };

  const handleEndGiveaway = async (id: string) => {
    if (!guildId) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/giveaways/${id}/end`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success('Giveaway ended!');
        invalidateGiveaways(guildId);
      } else {
        toast.error('Failed to end giveaway');
      }
    } catch {
      toast.error('Failed to end giveaway');
    }
  };

  const handleRerollGiveaway = async (id: string) => {
    if (!guildId) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/giveaways/${id}/reroll`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success('Winner re-rolled!');
        invalidateGiveaways(guildId);
      } else {
        toast.error('Failed to re-roll');
      }
    } catch {
      toast.error('Failed to re-roll');
    }
  };

  const _formatDuration = (seconds: number) => {
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const formatTimeRemaining = (endsAt: string) => {
    const end = new Date(endsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || 'Unknown Role';
  };

  if (loading) return (
    <div className="p-12 flex justify-center">
      <Loader2 className="animate-spin text-[hsl(174_72%_55%)] h-8 w-8" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="icon-badge icon-badge-aqua">
            <Gift className="h-7 w-7 text-[hsl(174_72%_55%)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Giveaway System</h1>
            <p className="text-gray-400 mt-1">Create viral campaigns and engage your community</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-[hsl(174_72%_45%)] to-[hsl(180_70%_35%)] hover:from-[hsl(174_72%_40%)] hover:to-[hsl(180_70%_30%)] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Giveaway
          </Button>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <Server className="h-5 w-5 text-gray-400" />
            <Select value={guildId || ''} onValueChange={setSelectedGuildId}>
              <SelectTrigger className="w-[180px] bg-transparent border-0 text-white focus:ring-0">
                <SelectValue placeholder="Select server" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d26] border-white/10">
                {guilds.map((guild) => (
                  <SelectItem key={guild.id} value={guild.id} className="text-white hover:bg-white/10 focus:bg-white/10">
                    {guild.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="surface-card border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <Play className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.activeGiveaways}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Gift className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalGiveaways}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalEntries}</p>
              <p className="text-xs text-gray-500">Entries</p>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.completedGiveaways}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card border-pink-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-pink-500/10">
              <Percent className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.totalGiveaways > 0 ? Math.round(stats.totalEntries / stats.totalGiveaways) : 0}
              </p>
              <p className="text-xs text-gray-500">Avg Entries</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[hsl(200_22%_16%)] border border-[hsl(200_20%_25%)] p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[hsl(174_72%_50%/0.2)] data-[state=active]:text-[hsl(174_72%_55%)] rounded-md">
            <Layers className="w-4 h-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-md">
            <Play className="w-4 h-4 mr-2" /> Active ({stats.activeGiveaways})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-[hsl(200_70%_50%/0.2)] data-[state=active]:text-[hsl(200_70%_55%)] rounded-md">
            <History className="w-4 h-4 mr-2" /> History
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 rounded-md">
            <Settings2 className="w-4 h-4 mr-2" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Recent/Active Giveaways */}
              <Card className="surface-card">
                <CardHeader className="border-b border-white/5 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <PartyPopper className="w-5 h-5 text-[hsl(174_72%_55%)]" />
                      <div>
                        <CardTitle className="text-white">Recent Giveaways</CardTitle>
                        <CardDescription className="text-gray-400">Your latest campaigns</CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('active')} className="text-gray-400 hover:text-white">
                      View All <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {giveaways.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-[hsl(174_72%_55%/0.1)] flex items-center justify-center mx-auto mb-4">
                        <Gift className="h-8 w-8 text-[hsl(174_72%_55%)]" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">No Giveaways Yet</h3>
                      <p className="text-gray-400 mb-4">Create your first giveaway to engage your community!</p>
                      <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-[hsl(174_72%_45%)] to-[hsl(180_70%_35%)]">
                        <Plus className="h-4 w-4 mr-2" /> Create Giveaway
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {giveaways.slice(0, 5).map((giveaway) => {
                        const StatusIcon = STATUS_ICONS[giveaway.status];
                        return (
                          <div key={giveaway.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: `${giveaway.embedColor}20` }}
                                >
                                  <Gift className="h-5 w-5" style={{ color: giveaway.embedColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium text-white truncate">{giveaway.prize}</h4>
                                    <Badge className={`${STATUS_COLORS[giveaway.status]} border text-xs`}>
                                      <StatusIcon className="w-3 h-3 mr-1" />
                                      {giveaway.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3 h-3" /> {giveaway.entries} entries
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Trophy className="w-3 h-3" /> {giveaway.winnerCount} winner{giveaway.winnerCount > 1 ? 's' : ''}
                                    </span>
                                    {giveaway.status === 'ACTIVE' && (
                                      <span className="flex items-center gap-1 text-emerald-400">
                                        <Clock className="w-3 h-3" /> {formatTimeRemaining(giveaway.endsAt)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {giveaway.status === 'ACTIVE' && (
                                  <Button size="sm" variant="ghost" onClick={() => handleEndGiveaway(giveaway.id)} className="text-amber-400 hover:bg-amber-500/10">
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                {giveaway.status === 'ENDED' && (
                                  <Button size="sm" variant="ghost" onClick={() => handleRerollGiveaway(giveaway.id)} className="text-blue-400 hover:bg-blue-500/10">
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => setDeleteId(giveaway.id)} className="text-red-400 hover:bg-red-500/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Tips */}
            <div className="space-y-6">
              <Card className="overflow-hidden bg-gradient-to-br from-[hsl(174_72%_50%/0.1)] via-[hsl(180_70%_40%/0.05)] to-transparent border-[hsl(174_72%_50%/0.2)]">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    Quick Create
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="w-full bg-gradient-to-r from-[hsl(174_72%_45%)] to-[hsl(180_70%_35%)] hover:from-[hsl(174_72%_40%)] hover:to-[hsl(180_70%_30%)] text-white shadow-lg"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Giveaway
                  </Button>
                  <p className="text-xs text-gray-500 text-center">Or use the slash command in Discord</p>
                  <code className="block bg-[hsl(200_22%_16%)] p-3 rounded-lg text-[hsl(174_72%_55%)] font-mono text-sm border border-[hsl(200_20%_25%)]">
                    /giveaway create
                  </code>
                </CardContent>
              </Card>

              <Card className="surface-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Pro Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <Trophy className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="text-sm text-white">Prize Tiers</p>
                      <p className="text-xs text-gray-500">1st, 2nd, 3rd place prizes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <Star className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="text-sm text-white">Bonus Entries</p>
                      <p className="text-xs text-gray-500">Extra chances for boosters</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <Shield className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-sm text-white">Requirements</p>
                      <p className="text-xs text-gray-500">Level, roles, account age</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <Calendar className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="text-sm text-white">Scheduling</p>
                      <p className="text-xs text-gray-500">Schedule future giveaways</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Active Tab */}
        <TabsContent value="active">
          <Card className="surface-card">
            <CardHeader className="border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Play className="w-5 h-5 text-emerald-400" />
                  <div>
                    <CardTitle className="text-white">Active Giveaways</CardTitle>
                    <CardDescription className="text-gray-400">Currently running campaigns</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {giveaways.filter(g => g.status === 'ACTIVE' || g.status === 'PENDING').length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <Play className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No Active Giveaways</h3>
                  <p className="text-gray-400 mb-4">Create a new giveaway to get started!</p>
                  <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500">
                    <Plus className="h-4 w-4 mr-2" /> Create Giveaway
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {giveaways.filter(g => g.status === 'ACTIVE' || g.status === 'PENDING').map((giveaway) => {
                    const StatusIcon = STATUS_ICONS[giveaway.status];
                    return (
                      <div key={giveaway.id} className="p-6">
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex items-start gap-4 flex-1">
                            <div
                              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${giveaway.embedColor}20` }}
                            >
                              <Gift className="h-7 w-7" style={{ color: giveaway.embedColor }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-white">{giveaway.prize}</h3>
                                <Badge className={`${STATUS_COLORS[giveaway.status]} border`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {giveaway.status}
                                </Badge>
                              </div>
                              {giveaway.description && (
                                <p className="text-gray-400 text-sm mb-3">{giveaway.description}</p>
                              )}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="w-4 h-4 text-purple-400" />
                                  <span className="text-gray-400">Entries:</span>
                                  <span className="text-white font-medium">{giveaway.entries}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Trophy className="w-4 h-4 text-amber-400" />
                                  <span className="text-gray-400">Winners:</span>
                                  <span className="text-white font-medium">{giveaway.winnerCount}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-4 h-4 text-emerald-400" />
                                  <span className="text-gray-400">Ends in:</span>
                                  <span className="text-emerald-400 font-medium">{formatTimeRemaining(giveaway.endsAt)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Hash className="w-4 h-4 text-blue-400" />
                                  <span className="text-gray-400">Channel:</span>
                                  <span className="text-white font-medium">
                                    {channels.find(c => c.id === giveaway.channelId)?.name || 'Unknown'}
                                  </span>
                                </div>
                              </div>
                              {(giveaway.requiredRoleIds.length > 0 || giveaway.requiredLevel > 0) && (
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-gray-500">Requirements:</span>
                                  {giveaway.requiredRoleIds.map(roleId => (
                                    <Badge key={roleId} variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                                      {getRoleName(roleId)}
                                    </Badge>
                                  ))}
                                  {giveaway.requiredLevel > 0 && (
                                    <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">
                                      Level {giveaway.requiredLevel}+
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button size="sm" onClick={() => handleEndGiveaway(giveaway.id)} className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">
                              <Check className="h-4 w-4 mr-2" /> End Now
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteId(giveaway.id)} className="text-red-400 hover:bg-red-500/10">
                              <Trash2 className="h-4 w-4 mr-2" /> Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="surface-card">
            <CardHeader className="border-b border-white/5">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-blue-400" />
                <div>
                  <CardTitle className="text-white">Giveaway History</CardTitle>
                  <CardDescription className="text-gray-400">Past and cancelled giveaways</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {giveaways.filter(g => g.status === 'ENDED' || g.status === 'CANCELLED').length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                    <History className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No History Yet</h3>
                  <p className="text-gray-400">Completed giveaways will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {giveaways.filter(g => g.status === 'ENDED' || g.status === 'CANCELLED').map((giveaway) => {
                    const StatusIcon = STATUS_ICONS[giveaway.status];
                    return (
                      <div key={giveaway.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 opacity-60"
                              style={{ backgroundColor: `${giveaway.embedColor}20` }}
                            >
                              <Gift className="h-5 w-5" style={{ color: giveaway.embedColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-300 truncate">{giveaway.prize}</h4>
                                <Badge className={`${STATUS_COLORS[giveaway.status]} border text-xs`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {giveaway.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                <span>{giveaway.entries} entries</span>
                                <span>{giveaway.winnerCount} winner{giveaway.winnerCount > 1 ? 's' : ''}</span>
                                <span>{new Date(giveaway.endedAt || giveaway.endsAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          {giveaway.status === 'ENDED' && (
                            <Button size="sm" variant="ghost" onClick={() => handleRerollGiveaway(giveaway.id)} className="text-blue-400 hover:bg-blue-500/10">
                              <RotateCcw className="h-4 w-4 mr-2" /> Re-roll
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-[hsl(174_72%_50%/0.1)] to-transparent border-b border-[hsl(200_20%_22%)] pb-4">
                  <div className="flex items-center gap-3">
                    <Palette className="w-5 h-5 text-[hsl(174_72%_55%)]" />
                    <div>
                      <CardTitle className="text-xl text-white">Default Appearance</CardTitle>
                      <CardDescription className="text-gray-400">
                        Default look for all your giveaways
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <EmbedEditor
                    value={{
                      title: "🎉 GIVEAWAY: 1x Nitro Monthly",
                      description: "Click the button below to enter!\nHosted by: **You**\nWinners: 1",
                      color: settings.giveawayColor,
                      imageUrl: settings.giveawayImageUrl,
                      footer: "Ends at • Today at 11:59 PM"
                    }}
                    onChange={(val) => setSettings(prev => ({
                      ...prev,
                      giveawayColor: val.color || '#14b8a6',
                      giveawayImageUrl: val.imageUrl || ''
                    }))}
                  />
                </CardContent>
              </Card>

              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <MousePointer2 className="w-5 h-5 text-purple-400" />
                    <div>
                      <CardTitle className="text-white">Button & Entry</CardTitle>
                      <CardDescription className="text-gray-400">Customize the entry button</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-yellow-400" />
                        Button Emoji
                      </Label>
                      <Input
                        value={settings.giveawayButtonEmoji}
                        onChange={e => setSettings(s => ({ ...s, giveawayButtonEmoji: e.target.value }))}
                        className="bg-[#1a1d26] border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Button Label</Label>
                      <Input
                        value={settings.giveawayButtonText}
                        onChange={e => setSettings(s => ({ ...s, giveawayButtonText: e.target.value }))}
                        className="bg-[#1a1d26] border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-[#1a1d26] rounded-xl border border-white/10 border-dashed flex flex-col items-center gap-3">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Preview</span>
                    <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 text-base">
                      <span className="mr-2 text-lg">{settings.giveawayButtonEmoji}</span>
                      {settings.giveawayButtonText}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-amber-400" />
                    <div>
                      <CardTitle className="text-white">Winner Settings</CardTitle>
                      <CardDescription className="text-gray-400">Configure winner notifications</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Send className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-white">DM Winners</p>
                        <p className="text-xs text-gray-500">Send congratulations via DM</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.dmWinners}
                      onCheckedChange={(v) => setSettings(s => ({ ...s, dmWinners: v }))}
                    />
                  </div>

                  {settings.dmWinners && (
                    <div className="space-y-2">
                      <Label className="text-gray-300">Winner DM Message</Label>
                      <Textarea
                        value={settings.dmWinnerMessage}
                        onChange={e => setSettings(s => ({ ...s, dmWinnerMessage: e.target.value }))}
                        placeholder="Congratulations! You won {prize} in {server}! 🎉"
                        className="bg-[#1a1d26] border-white/10 text-white min-h-[80px]"
                      />
                      <p className="text-xs text-gray-500">Variables: {'{prize}'}, {'{server}'}, {'{host}'}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <RotateCcw className="h-5 w-5 text-purple-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Auto Re-roll</p>
                        <p className="text-xs text-gray-500">Re-roll if winner doesn&apos;t claim</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.autoReroll}
                      onCheckedChange={(v) => setSettings(s => ({ ...s, autoReroll: v }))}
                    />
                  </div>

                  {settings.autoReroll && (
                    <div className="space-y-2">
                      <Label className="text-gray-300">Claim Timeout (hours)</Label>
                      <Input
                        type="number"
                        value={settings.winnerClaimTimeout}
                        onChange={e => setSettings(s => ({ ...s, winnerClaimTimeout: parseInt(e.target.value) || 24 }))}
                        className="bg-[#1a1d26] border-white/10 text-white"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="overflow-hidden bg-gradient-to-br from-[hsl(174_72%_50%/0.1)] via-[hsl(180_70%_40%/0.05)] to-transparent border-[hsl(174_72%_50%/0.2)]">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white">Save Changes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleSaveSettings}
                    disabled={updateGiveawaySettings.isPending}
                    className="w-full bg-gradient-to-r from-[hsl(174_72%_45%)] to-[hsl(180_70%_35%)] hover:from-[hsl(174_72%_40%)] hover:to-[hsl(180_70%_30%)] text-white shadow-lg"
                  >
                    {updateGiveawaySettings.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                  </Button>
                </CardContent>
              </Card>

              <Card className="surface-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    Commands
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="p-3 rounded-lg bg-white/5">
                    <code className="text-[hsl(174_72%_55%)]">/giveaway create</code>
                    <p className="text-xs text-gray-500 mt-1">Start a new giveaway</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <code className="text-blue-400">/giveaway end</code>
                    <p className="text-xs text-gray-500 mt-1">End giveaway early</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <code className="text-purple-400">/giveaway reroll</code>
                    <p className="text-xs text-gray-500 mt-1">Re-roll a winner</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <code className="text-amber-400">/giveaway list</code>
                    <p className="text-xs text-gray-500 mt-1">View active giveaways</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Giveaway Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#1a1d26] border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Gift className="h-5 w-5 text-[hsl(174_72%_55%)]" />
              Create New Giveaway
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Set up your giveaway with all the bells and whistles
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                Prize Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Prize Name *</Label>
                  <Input
                    value={newGiveaway.prize}
                    onChange={e => setNewGiveaway(g => ({ ...g, prize: e.target.value }))}
                    placeholder="1x Discord Nitro Monthly"
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={newGiveaway.description}
                    onChange={e => setNewGiveaway(g => ({ ...g, description: e.target.value }))}
                    placeholder="Enter for a chance to win amazing prizes!"
                    className="bg-[#0f1218] border-white/10 text-white min-h-[60px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Channel *</Label>
                  <ChannelSelector
                    channels={channels}
                    value={newGiveaway.channelId}
                    onChange={(v) => setNewGiveaway(g => ({ ...g, channelId: v }))}
                    placeholder="Select channel"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Number of Winners</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={newGiveaway.winnerCount}
                    onChange={e => setNewGiveaway(g => ({ ...g, winnerCount: parseInt(e.target.value) || 1 }))}
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Prize Tiers Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <Medal className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium">Prize Tiers</p>
                    <p className="text-xs text-gray-500">Different prizes for 1st, 2nd, 3rd place</p>
                  </div>
                </div>
                <Switch
                  checked={newGiveaway.usePrizeTiers}
                  onCheckedChange={(v) => setNewGiveaway(g => ({ ...g, usePrizeTiers: v }))}
                />
              </div>

              {newGiveaway.usePrizeTiers && (
                <div className="space-y-3 p-4 rounded-lg bg-white/5">
                  {newGiveaway.prizeTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Badge className={idx === 0 ? 'bg-yellow-500/20 text-yellow-400' : idx === 1 ? 'bg-gray-400/20 text-gray-300' : 'bg-amber-700/20 text-amber-600'}>
                        {idx + 1}{idx === 0 ? 'st' : idx === 1 ? 'nd' : 'rd'}
                      </Badge>
                      <Input
                        value={tier.prize}
                        onChange={e => {
                          const updated = [...newGiveaway.prizeTiers];
                          updated[idx].prize = e.target.value;
                          setNewGiveaway(g => ({ ...g, prizeTiers: updated }));
                        }}
                        placeholder={`${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : 'rd'} place prize`}
                        className="bg-[#0f1218] border-white/10 text-white flex-1"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={tier.count}
                        onChange={e => {
                          const updated = [...newGiveaway.prizeTiers];
                          updated[idx].count = parseInt(e.target.value) || 1;
                          setNewGiveaway(g => ({ ...g, prizeTiers: updated }));
                        }}
                        className="bg-[#0f1218] border-white/10 text-white w-20"
                        placeholder="Count"
                      />
                      {idx > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const updated = newGiveaway.prizeTiers.filter((_, i) => i !== idx);
                            setNewGiveaway(g => ({ ...g, prizeTiers: updated }));
                          }}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {newGiveaway.prizeTiers.length < 5 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newPlace = newGiveaway.prizeTiers.length + 1;
                        setNewGiveaway(g => ({
                          ...g,
                          prizeTiers: [...g.prizeTiers, { place: newPlace, prize: '', count: 1 }]
                        }));
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Tier
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Duration & Scheduling */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                Duration & Timing
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select
                    value={String(newGiveaway.duration)}
                    onValueChange={(v) => setNewGiveaway(g => ({ ...g, duration: parseInt(v) }))}
                  >
                    <SelectTrigger className="bg-[#0f1218] border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d26] border-white/10">
                      <SelectItem value="3600">1 hour</SelectItem>
                      <SelectItem value="7200">2 hours</SelectItem>
                      <SelectItem value="21600">6 hours</SelectItem>
                      <SelectItem value="43200">12 hours</SelectItem>
                      <SelectItem value="86400">1 day</SelectItem>
                      <SelectItem value="172800">2 days</SelectItem>
                      <SelectItem value="259200">3 days</SelectItem>
                      <SelectItem value="604800">1 week</SelectItem>
                      <SelectItem value="1209600">2 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <CalendarClock className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="text-sm font-medium">Schedule Start</p>
                      <p className="text-xs text-gray-500">Start at specific time</p>
                    </div>
                  </div>
                  <Switch
                    checked={newGiveaway.scheduleStart}
                    onCheckedChange={(v) => setNewGiveaway(g => ({ ...g, scheduleStart: v }))}
                  />
                </div>
              </div>

              {newGiveaway.scheduleStart && (
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={newGiveaway.startsAt}
                    onChange={e => setNewGiveaway(g => ({ ...g, startsAt: e.target.value }))}
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>
              )}
            </div>

            {/* Requirements */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                Entry Requirements
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Required Roles (any)</Label>
                  <RoleSelector
                    roles={roles}
                    value={newGiveaway.requiredRoleIds}
                    onChange={(v) => setNewGiveaway(g => ({ ...g, requiredRoleIds: Array.isArray(v) ? v : [v] }))}
                    placeholder="Select required roles"
                    multiple
                  />
                </div>

                <div className="space-y-2">
                  <Label>Blacklisted Roles</Label>
                  <RoleSelector
                    roles={roles}
                    value={newGiveaway.blacklistRoleIds}
                    onChange={(v) => setNewGiveaway(g => ({ ...g, blacklistRoleIds: Array.isArray(v) ? v : [v] }))}
                    placeholder="Select blacklisted roles"
                    multiple
                  />
                </div>

                <div className="space-y-2">
                  <Label>Minimum Level</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newGiveaway.requiredLevel}
                    onChange={e => setNewGiveaway(g => ({ ...g, requiredLevel: parseInt(e.target.value) || 0 }))}
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Minimum Messages</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newGiveaway.requiredMessages}
                    onChange={e => setNewGiveaway(g => ({ ...g, requiredMessages: parseInt(e.target.value) || 0 }))}
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account Age (days)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newGiveaway.requiredAccountAge}
                    onChange={e => setNewGiveaway(g => ({ ...g, requiredAccountAge: parseInt(e.target.value) || 0 }))}
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Server Age (days)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newGiveaway.requiredServerAge}
                    onChange={e => setNewGiveaway(g => ({ ...g, requiredServerAge: parseInt(e.target.value) || 0 }))}
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Bonus Entries */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                Bonus Entries
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <Crown className="h-5 w-5 text-pink-400" />
                    <div>
                      <p className="text-sm font-medium">Server Boosters</p>
                      <p className="text-xs text-gray-500">Extra entries for boosters</p>
                    </div>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={newGiveaway.boosterBonusEntries}
                    onChange={e => setNewGiveaway(g => ({ ...g, boosterBonusEntries: parseInt(e.target.value) || 0 }))}
                    className="bg-[#0f1218] border-white/10 text-white w-20"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-3 p-4 rounded-lg bg-white/5">
                  <Label className="text-sm font-medium">Role Bonus Entries</Label>
                  {newGiveaway.bonusEntryRoles.map((role, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Select
                        value={role.roleId}
                        onValueChange={(v) => {
                          const updated = [...newGiveaway.bonusEntryRoles];
                          updated[idx].roleId = v;
                          updated[idx].roleName = roles.find(r => r.id === v)?.name;
                          setNewGiveaway(g => ({ ...g, bonusEntryRoles: updated }));
                        }}
                      >
                        <SelectTrigger className="bg-[#0f1218] border-white/10 text-white flex-1">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d26] border-white/10">
                          {roles.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={role.entries}
                        onChange={e => {
                          const updated = [...newGiveaway.bonusEntryRoles];
                          updated[idx].entries = parseInt(e.target.value) || 1;
                          setNewGiveaway(g => ({ ...g, bonusEntryRoles: updated }));
                        }}
                        className="bg-[#0f1218] border-white/10 text-white w-20"
                        placeholder="Entries"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const updated = newGiveaway.bonusEntryRoles.filter((_, i) => i !== idx);
                          setNewGiveaway(g => ({ ...g, bonusEntryRoles: updated }));
                        }}
                        className="text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setNewGiveaway(g => ({
                        ...g,
                        bonusEntryRoles: [...g.bonusEntryRoles, { roleId: '', entries: 2 }]
                      }));
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Role Bonus
                  </Button>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Palette className="h-4 w-4 text-cyan-400" />
                Appearance
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Embed Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newGiveaway.embedColor}
                      onChange={e => setNewGiveaway(g => ({ ...g, embedColor: e.target.value }))}
                      className="w-10 h-10 rounded-lg cursor-pointer"
                    />
                    <Input
                      value={newGiveaway.embedColor}
                      onChange={e => setNewGiveaway(g => ({ ...g, embedColor: e.target.value }))}
                      className="bg-[#0f1218] border-white/10 text-white flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Button Text</Label>
                  <Input
                    value={newGiveaway.buttonText}
                    onChange={e => setNewGiveaway(g => ({ ...g, buttonText: e.target.value }))}
                    placeholder="🎉 Enter Giveaway"
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Image URL (optional)</Label>
                  <Input
                    value={newGiveaway.imageUrl}
                    onChange={e => setNewGiveaway(g => ({ ...g, imageUrl: e.target.value }))}
                    placeholder="https://example.com/prize-image.png"
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="text-gray-400">
              Cancel
            </Button>
            <Button
              onClick={handleCreateGiveaway}
              disabled={creating || !newGiveaway.prize || !newGiveaway.channelId}
              className="bg-gradient-to-r from-[hsl(174_72%_45%)] to-[hsl(180_70%_35%)]"
            >
              {creating && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              <Gift className="mr-2 h-4 w-4" />
              Create Giveaway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#1a1d26] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete Giveaway?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently delete this giveaway. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGiveaway}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
