'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Save, Shield, AlertCircle, Server, MessageSquare, Link2, AtSign, Ban,
  AlertTriangle, Hash, Clock, Users, Filter, Plus, X, Settings, Eye, Zap,
  UserX, Volume2, ImageIcon, FileText, Globe, Lock, Trash2, Edit2, CheckCircle,
  Copy, ExternalLink, Sparkles, Crown, Bell, History, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ChannelSelector, Channel } from '@/components/selectors/channel-selector';
import { RoleSelector } from '@/components/selectors/role-selector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useGuildContext } from '@/context/guild-context';
import { useGuilds, useGuildChannels } from '@/hooks';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface ModerationSettings {
  // Anti-Spam
  antiSpamEnabled: boolean;
  antiSpamMaxMessages: number;
  antiSpamInterval: number;
  antiSpamDuplicates: number;
  antiSpamWarnThreshold: number;
  antiSpamMuteThreshold: number;
  antiSpamMuteDuration: number;
  antiSpamAction: 'DELETE' | 'WARN' | 'MUTE' | 'KICK' | 'BAN';
  antiSpamIgnoreRoles: string[];
  antiSpamIgnoreChannels: string[];

  // Anti-Link
  antiLinkEnabled: boolean;
  antiLinkWhitelist: string[];
  antiLinkAction: 'DELETE' | 'WARN' | 'MUTE';
  antiLinkIgnoreRoles: string[];
  antiLinkAllowImages: boolean;
  antiLinkAllowGifs: boolean;

  // Word Filter
  wordFilterEnabled: boolean;
  filteredWords: string[];
  wordFilterAction: 'DELETE' | 'WARN' | 'MUTE';
  wordFilterIgnoreRoles: string[];
  wordFilterRegex: boolean;

  // Mention Spam
  mentionSpamEnabled: boolean;
  mentionSpamThreshold: number;
  mentionSpamAction: 'DELETE' | 'WARN' | 'MUTE' | 'BAN';
  mentionSpamIgnoreRoles: string[];

  // Anti-Raid
  antiRaidEnabled: boolean;
  antiRaidJoinThreshold: number;
  antiRaidJoinInterval: number;
  antiRaidAction: 'LOCKDOWN' | 'KICK_NEW' | 'BAN_NEW';
  antiRaidMinAccountAge: number;
  antiRaidNotifyChannel: string;

  // Caps Filter
  capsFilterEnabled: boolean;
  capsFilterThreshold: number;
  capsFilterMinLength: number;

  // Emoji Spam
  emojiSpamEnabled: boolean;
  emojiSpamThreshold: number;

  // Invite Filter
  inviteFilterEnabled: boolean;
  inviteFilterWhitelist: string[];

  // Log Channel
  modLogChannelId: string;

  // Custom Invites
  customInviteEnabled: boolean;
  customInviteCode: string;
  customInviteChannel: string;
}

interface Role {
  id: string;
  name: string;
  color: number;
}

// Channel type imported from @/components/selectors/channel-selector

// ═══════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════

const DEFAULT_SETTINGS: ModerationSettings = {
  antiSpamEnabled: false,
  antiSpamMaxMessages: 5,
  antiSpamInterval: 5,
  antiSpamDuplicates: 3,
  antiSpamWarnThreshold: 3,
  antiSpamMuteThreshold: 5,
  antiSpamMuteDuration: 10,
  antiSpamAction: 'MUTE',
  antiSpamIgnoreRoles: [],
  antiSpamIgnoreChannels: [],

  antiLinkEnabled: false,
  antiLinkWhitelist: ['discord.com', 'discord.gg'],
  antiLinkAction: 'DELETE',
  antiLinkIgnoreRoles: [],
  antiLinkAllowImages: true,
  antiLinkAllowGifs: true,

  wordFilterEnabled: false,
  filteredWords: [],
  wordFilterAction: 'DELETE',
  wordFilterIgnoreRoles: [],
  wordFilterRegex: false,

  mentionSpamEnabled: false,
  mentionSpamThreshold: 5,
  mentionSpamAction: 'MUTE',
  mentionSpamIgnoreRoles: [],

  antiRaidEnabled: false,
  antiRaidJoinThreshold: 10,
  antiRaidJoinInterval: 60,
  antiRaidAction: 'LOCKDOWN',
  antiRaidMinAccountAge: 7,
  antiRaidNotifyChannel: '',

  capsFilterEnabled: false,
  capsFilterThreshold: 70,
  capsFilterMinLength: 10,

  emojiSpamEnabled: false,
  emojiSpamThreshold: 10,

  inviteFilterEnabled: false,
  inviteFilterWhitelist: [],

  modLogChannelId: '',

  customInviteEnabled: false,
  customInviteCode: '',
  customInviteChannel: '',
};

const ACTION_OPTIONS = [
  { value: 'DELETE', label: 'Delete Message', icon: Trash2, color: 'text-gray-400' },
  { value: 'WARN', label: 'Warn User', icon: AlertTriangle, color: 'text-yellow-400' },
  { value: 'MUTE', label: 'Mute User', icon: Volume2, color: 'text-orange-400' },
  { value: 'KICK', label: 'Kick User', icon: UserX, color: 'text-red-400' },
  { value: 'BAN', label: 'Ban User', icon: Ban, color: 'text-red-500' },
];

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState('antispam');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ModerationSettings>(DEFAULT_SETTINGS);

  // Temp inputs
  const [newWord, setNewWord] = useState('');
  const [newWhitelistDomain, setNewWhitelistDomain] = useState('');
  const [newInviteWhitelist, setNewInviteWhitelist] = useState('');

  // Guild data
  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  const { selectedGuildId, setSelectedGuildId } = useGuildContext();
  const { data: guilds, isLoading: guildsLoading, error: guildsError } = useGuilds();

  // Fetch guild data
  const fetchGuildData = useCallback(async () => {
    if (!selectedGuildId) return;
    setLoading(true);

    try {
      const [rolesRes, channelsRes, moderationRes] = await Promise.all([
        fetch(`/api/guilds/${selectedGuildId}/roles`),
        fetch(`/api/guilds/${selectedGuildId}/channels`),
        fetch(`/api/guilds/${selectedGuildId}/moderation`),
      ]);

      if (rolesRes.ok) {
        const { data } = await rolesRes.json();
        setRoles(data || []);
      }

      if (channelsRes.ok) {
        const { data } = await channelsRes.json();
        // Filter to text channels and properly type-cast
        const textChannels = (data || [])
          .filter((c: { type: string }) => c.type === 'text')
          .map((c: { id: string; name: string; type: string; parentId?: string | null; parentName?: string }) => ({
            ...c,
            type: c.type as Channel['type'],
          }));
        setChannels(textChannels);
      }

      if (moderationRes.ok) {
        const { data } = await moderationRes.json();
        if (data) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch guild data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedGuildId]);

  useEffect(() => {
    if (!selectedGuildId && guilds?.length) {
      setSelectedGuildId(guilds[0].id);
    }
  }, [guilds, selectedGuildId, setSelectedGuildId]);

  useEffect(() => {
    fetchGuildData();
  }, [fetchGuildData]);

  const handleSave = async () => {
    if (!selectedGuildId) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/guilds/${selectedGuildId}/moderation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success('Settings saved successfully!');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Word filter helpers
  const addFilteredWord = () => {
    if (!newWord.trim()) return;
    if (!settings.filteredWords.includes(newWord.trim().toLowerCase())) {
      setSettings(prev => ({
        ...prev,
        filteredWords: [...prev.filteredWords, newWord.trim().toLowerCase()]
      }));
    }
    setNewWord('');
  };

  const removeFilteredWord = (word: string) => {
    setSettings(prev => ({
      ...prev,
      filteredWords: prev.filteredWords.filter(w => w !== word)
    }));
  };

  // Link whitelist helpers
  const addWhitelistDomain = () => {
    if (!newWhitelistDomain.trim()) return;
    if (!settings.antiLinkWhitelist.includes(newWhitelistDomain.trim().toLowerCase())) {
      setSettings(prev => ({
        ...prev,
        antiLinkWhitelist: [...prev.antiLinkWhitelist, newWhitelistDomain.trim().toLowerCase()]
      }));
    }
    setNewWhitelistDomain('');
  };

  const removeWhitelistDomain = (domain: string) => {
    setSettings(prev => ({
      ...prev,
      antiLinkWhitelist: prev.antiLinkWhitelist.filter(d => d !== domain)
    }));
  };

  // Invite whitelist helpers
  const addInviteWhitelist = () => {
    if (!newInviteWhitelist.trim()) return;
    if (!settings.inviteFilterWhitelist.includes(newInviteWhitelist.trim())) {
      setSettings(prev => ({
        ...prev,
        inviteFilterWhitelist: [...prev.inviteFilterWhitelist, newInviteWhitelist.trim()]
      }));
    }
    setNewInviteWhitelist('');
  };

  const removeInviteWhitelist = (invite: string) => {
    setSettings(prev => ({
      ...prev,
      inviteFilterWhitelist: prev.inviteFilterWhitelist.filter(i => i !== invite)
    }));
  };

  // Copy custom invite
  const copyCustomInvite = () => {
    if (settings.customInviteCode) {
      navigator.clipboard.writeText(`https://discord.gg/${settings.customInviteCode}`);
      toast.success('Invite link copied!');
    }
  };

  if (guildsLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-red-400" />
      </div>
    );
  }

  if (guildsError || !guilds?.length) {
    return (
      <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {guildsError ? 'Failed to load servers' : 'No servers found.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="icon-badge bg-red-500/20 border-red-500/30">
            <Shield className="h-7 w-7 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Auto Moderation</h1>
            <p className="text-gray-400 mt-1">Protect your server from spam, raids, and abuse</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <Server className="h-5 w-5 text-gray-400" />
            <Select value={selectedGuildId || ''} onValueChange={setSelectedGuildId}>
              <SelectTrigger className="w-[180px] bg-transparent border-0 text-white focus:ring-0">
                <SelectValue placeholder="Select server" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d26] border-white/10">
                {guilds.map((guild) => (
                  <SelectItem key={guild.id} value={guild.id} className="text-white hover:bg-white/10">
                    {guild.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[hsl(200_22%_16%)] border border-[hsl(200_20%_25%)] p-1 flex-wrap">
          <TabsTrigger value="antispam" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 rounded-md">
            <MessageSquare className="w-4 h-4 mr-2" /> Anti-Spam
          </TabsTrigger>
          <TabsTrigger value="antilink" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 rounded-md">
            <Link2 className="w-4 h-4 mr-2" /> Anti-Link
          </TabsTrigger>
          <TabsTrigger value="wordfilter" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 rounded-md">
            <Filter className="w-4 h-4 mr-2" /> Word Filter
          </TabsTrigger>
          <TabsTrigger value="mentions" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 rounded-md">
            <AtSign className="w-4 h-4 mr-2" /> Mentions
          </TabsTrigger>
          <TabsTrigger value="antiraid" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400 rounded-md">
            <Shield className="w-4 h-4 mr-2" /> Anti-Raid
          </TabsTrigger>
          <TabsTrigger value="invites" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-md">
            <Globe className="w-4 h-4 mr-2" /> Invites
          </TabsTrigger>
          <TabsTrigger value="logging" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 rounded-md">
            <History className="w-4 h-4 mr-2" /> Logging
          </TabsTrigger>
        </TabsList>

        {/* Anti-Spam Tab */}
        <TabsContent value="antispam" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-red-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-red-400" />
                    <div>
                      <CardTitle className="text-white">Anti-Spam Protection</CardTitle>
                      <CardDescription className="text-gray-400">Detect and handle message spam automatically</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-white font-medium">Enable Anti-Spam</p>
                        <p className="text-gray-400 text-sm">Automatically detect spam messages</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.antiSpamEnabled}
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, antiSpamEnabled: checked }))}
                    />
                  </div>

                  {settings.antiSpamEnabled && (
                    <>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-300">Max Messages</Label>
                          <Input
                            type="number"
                            min={3}
                            max={20}
                            value={settings.antiSpamMaxMessages}
                            onChange={(e) => setSettings(s => ({ ...s, antiSpamMaxMessages: parseInt(e.target.value) || 5 }))}
                            className="bg-[#1a1d26] border-white/10 text-white"
                          />
                          <p className="text-xs text-gray-500">Messages before triggering</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-300">Interval (seconds)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={settings.antiSpamInterval}
                            onChange={(e) => setSettings(s => ({ ...s, antiSpamInterval: parseInt(e.target.value) || 5 }))}
                            className="bg-[#1a1d26] border-white/10 text-white"
                          />
                          <p className="text-xs text-gray-500">Time window</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-300">Duplicate Messages</Label>
                          <Input
                            type="number"
                            min={2}
                            max={10}
                            value={settings.antiSpamDuplicates}
                            onChange={(e) => setSettings(s => ({ ...s, antiSpamDuplicates: parseInt(e.target.value) || 3 }))}
                            className="bg-[#1a1d26] border-white/10 text-white"
                          />
                          <p className="text-xs text-gray-500">Same message count</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-300 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-400" />
                            Warn Threshold
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={settings.antiSpamWarnThreshold}
                            onChange={(e) => setSettings(s => ({ ...s, antiSpamWarnThreshold: parseInt(e.target.value) || 3 }))}
                            className="bg-[#1a1d26] border-white/10 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-300 flex items-center gap-2">
                            <Ban className="h-4 w-4 text-red-400" />
                            Mute Threshold
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            max={15}
                            value={settings.antiSpamMuteThreshold}
                            onChange={(e) => setSettings(s => ({ ...s, antiSpamMuteThreshold: parseInt(e.target.value) || 5 }))}
                            className="bg-[#1a1d26] border-white/10 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-300 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-400" />
                            Mute Duration (min)
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            max={1440}
                            value={settings.antiSpamMuteDuration}
                            onChange={(e) => setSettings(s => ({ ...s, antiSpamMuteDuration: parseInt(e.target.value) || 10 }))}
                            className="bg-[#1a1d26] border-white/10 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Action</Label>
                        <Select
                          value={settings.antiSpamAction}
                          onValueChange={(v) => setSettings(s => ({ ...s, antiSpamAction: v as ModerationSettings['antiSpamAction'] }))}
                        >
                          <SelectTrigger className="bg-[#1a1d26] border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1d26] border-white/10">
                            {ACTION_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10">
                                <div className="flex items-center gap-2">
                                  <option.icon className={`w-4 h-4 ${option.color}`} />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Ignored Roles</Label>
                        <RoleSelector
                          roles={roles}
                          value={settings.antiSpamIgnoreRoles}
                          onChange={(v) => setSettings(s => ({ ...s, antiSpamIgnoreRoles: v as string[] }))}
                          placeholder="Select roles to ignore"
                          multiple
                        />
                        <p className="text-xs text-gray-500">These roles won't trigger anti-spam</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Caps Filter & Emoji Spam */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="surface-card">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-yellow-400" />
                        <CardTitle className="text-white text-sm">Caps Filter</CardTitle>
                      </div>
                      <Switch
                        checked={settings.capsFilterEnabled}
                        onCheckedChange={(checked) => setSettings(s => ({ ...s, capsFilterEnabled: checked }))}
                      />
                    </div>
                  </CardHeader>
                  {settings.capsFilterEnabled && (
                    <CardContent className="space-y-4 pt-0">
                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm">Caps Threshold (%)</Label>
                        <Input
                          type="number"
                          min={50}
                          max={100}
                          value={settings.capsFilterThreshold}
                          onChange={(e) => setSettings(s => ({ ...s, capsFilterThreshold: parseInt(e.target.value) || 70 }))}
                          className="bg-[#1a1d26] border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm">Min Message Length</Label>
                        <Input
                          type="number"
                          min={5}
                          max={100}
                          value={settings.capsFilterMinLength}
                          onChange={(e) => setSettings(s => ({ ...s, capsFilterMinLength: parseInt(e.target.value) || 10 }))}
                          className="bg-[#1a1d26] border-white/10 text-white"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                <Card className="surface-card">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-pink-400" />
                        <CardTitle className="text-white text-sm">Emoji Spam</CardTitle>
                      </div>
                      <Switch
                        checked={settings.emojiSpamEnabled}
                        onCheckedChange={(checked) => setSettings(s => ({ ...s, emojiSpamEnabled: checked }))}
                      />
                    </div>
                  </CardHeader>
                  {settings.emojiSpamEnabled && (
                    <CardContent className="space-y-4 pt-0">
                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm">Max Emojis per Message</Label>
                        <Input
                          type="number"
                          min={3}
                          max={50}
                          value={settings.emojiSpamThreshold}
                          onChange={(e) => setSettings(s => ({ ...s, emojiSpamThreshold: parseInt(e.target.value) || 10 }))}
                          className="bg-[#1a1d26] border-white/10 text-white"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="surface-card border-red-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-red-400 flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    How it works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-400">
                  <p>• {settings.antiSpamMaxMessages} messages in {settings.antiSpamInterval}s = spam</p>
                  <p>• {settings.antiSpamDuplicates} duplicate messages = spam</p>
                  <p>• {settings.antiSpamWarnThreshold} violations = warning</p>
                  <p>• {settings.antiSpamMuteThreshold} violations = {settings.antiSpamMuteDuration}min mute</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Anti-Link Tab */}
        <TabsContent value="antilink" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Link2 className="w-5 h-5 text-blue-400" />
                    <div>
                      <CardTitle className="text-white">Anti-Link Protection</CardTitle>
                      <CardDescription className="text-gray-400">Automatically delete messages containing links</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-white font-medium">Enable Anti-Link</p>
                        <p className="text-gray-400 text-sm">Delete messages with links</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.antiLinkEnabled}
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, antiLinkEnabled: checked }))}
                    />
                  </div>

                  {settings.antiLinkEnabled && (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-purple-400" />
                            <span className="text-sm text-gray-300">Allow Images</span>
                          </div>
                          <Switch
                            checked={settings.antiLinkAllowImages}
                            onCheckedChange={(checked) => setSettings(s => ({ ...s, antiLinkAllowImages: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-pink-400" />
                            <span className="text-sm text-gray-300">Allow GIFs</span>
                          </div>
                          <Switch
                            checked={settings.antiLinkAllowGifs}
                            onCheckedChange={(checked) => setSettings(s => ({ ...s, antiLinkAllowGifs: checked }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Action</Label>
                        <Select
                          value={settings.antiLinkAction}
                          onValueChange={(v) => setSettings(s => ({ ...s, antiLinkAction: v as ModerationSettings['antiLinkAction'] }))}
                        >
                          <SelectTrigger className="bg-[#1a1d26] border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1d26] border-white/10">
                            {ACTION_OPTIONS.slice(0, 3).map(option => (
                              <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10">
                                <div className="flex items-center gap-2">
                                  <option.icon className={`w-4 h-4 ${option.color}`} />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-gray-300">Whitelisted Domains</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newWhitelistDomain}
                            onChange={(e) => setNewWhitelistDomain(e.target.value)}
                            placeholder="discord.com"
                            className="bg-[#1a1d26] border-white/10 text-white placeholder:text-gray-500"
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addWhitelistDomain())}
                          />
                          <Button type="button" onClick={addWhitelistDomain} variant="outline" className="border-white/10 text-white hover:bg-white/5">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {settings.antiLinkWhitelist.map((domain) => (
                            <Badge key={domain} className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {domain}
                              <button onClick={() => removeWhitelistDomain(domain)} className="ml-1 hover:text-white">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Ignored Roles</Label>
                        <RoleSelector
                          roles={roles}
                          value={settings.antiLinkIgnoreRoles}
                          onChange={(v) => setSettings(s => ({ ...s, antiLinkIgnoreRoles: v as string[] }))}
                          placeholder="Select roles to ignore"
                          multiple
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Word Filter Tab */}
        <TabsContent value="wordfilter" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-orange-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-orange-400" />
                    <div>
                      <CardTitle className="text-white">Word Filter</CardTitle>
                      <CardDescription className="text-gray-400">Block specific words and phrases</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-white font-medium">Enable Word Filter</p>
                        <p className="text-gray-400 text-sm">Filter messages with blocked words</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.wordFilterEnabled}
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, wordFilterEnabled: checked }))}
                    />
                  </div>

                  {settings.wordFilterEnabled && (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-300">Action</Label>
                          <Select
                            value={settings.wordFilterAction}
                            onValueChange={(v) => setSettings(s => ({ ...s, wordFilterAction: v as ModerationSettings['wordFilterAction'] }))}
                          >
                            <SelectTrigger className="bg-[#1a1d26] border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1d26] border-white/10">
                              {ACTION_OPTIONS.slice(0, 3).map(option => (
                                <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10">
                                  <div className="flex items-center gap-2">
                                    <option.icon className={`w-4 h-4 ${option.color}`} />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-purple-400" />
                            <span className="text-sm text-gray-300">Use Regex</span>
                          </div>
                          <Switch
                            checked={settings.wordFilterRegex}
                            onCheckedChange={(checked) => setSettings(s => ({ ...s, wordFilterRegex: checked }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-gray-300">Filtered Words</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newWord}
                            onChange={(e) => setNewWord(e.target.value)}
                            placeholder="Add a word to filter..."
                            className="bg-[#1a1d26] border-white/10 text-white placeholder:text-gray-500"
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFilteredWord())}
                          />
                          <Button type="button" onClick={addFilteredWord} variant="outline" className="border-white/10 text-white hover:bg-white/5">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 rounded-lg bg-[#0f1218]">
                          {settings.filteredWords.map((word) => (
                            <Badge key={word} className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                              {word}
                              <button onClick={() => removeFilteredWord(word)} className="ml-1 hover:text-white">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {settings.filteredWords.length === 0 && (
                            <p className="text-gray-500 text-sm p-2">No words filtered yet</p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{settings.filteredWords.length} words filtered</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Ignored Roles</Label>
                        <RoleSelector
                          roles={roles}
                          value={settings.wordFilterIgnoreRoles}
                          onChange={(v) => setSettings(s => ({ ...s, wordFilterIgnoreRoles: v as string[] }))}
                          placeholder="Select roles to ignore"
                          multiple
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Mention Spam Tab */}
        <TabsContent value="mentions" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <AtSign className="w-5 h-5 text-purple-400" />
                    <div>
                      <CardTitle className="text-white">Mention Spam Protection</CardTitle>
                      <CardDescription className="text-gray-400">Prevent mass mention attacks</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-white font-medium">Enable Mention Spam Protection</p>
                        <p className="text-gray-400 text-sm">Delete messages with too many mentions</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.mentionSpamEnabled}
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, mentionSpamEnabled: checked }))}
                    />
                  </div>

                  {settings.mentionSpamEnabled && (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-300 flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-400" />
                            Max Mentions per Message
                          </Label>
                          <Input
                            type="number"
                            min={3}
                            max={20}
                            value={settings.mentionSpamThreshold}
                            onChange={(e) => setSettings(s => ({ ...s, mentionSpamThreshold: parseInt(e.target.value) || 5 }))}
                            className="bg-[#1a1d26] border-white/10 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Action</Label>
                          <Select
                            value={settings.mentionSpamAction}
                            onValueChange={(v) => setSettings(s => ({ ...s, mentionSpamAction: v as ModerationSettings['mentionSpamAction'] }))}
                          >
                            <SelectTrigger className="bg-[#1a1d26] border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1d26] border-white/10">
                              {ACTION_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10">
                                  <div className="flex items-center gap-2">
                                    <option.icon className={`w-4 h-4 ${option.color}`} />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Ignored Roles</Label>
                        <RoleSelector
                          roles={roles}
                          value={settings.mentionSpamIgnoreRoles}
                          onChange={(v) => setSettings(s => ({ ...s, mentionSpamIgnoreRoles: v as string[] }))}
                          placeholder="Select roles to ignore"
                          multiple
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Anti-Raid Tab */}
        <TabsContent value="antiraid" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-pink-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-pink-400" />
                    <div>
                      <CardTitle className="text-white">Anti-Raid Protection</CardTitle>
                      <CardDescription className="text-gray-400">Protect against mass join raids</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-white font-medium">Enable Anti-Raid</p>
                        <p className="text-gray-400 text-sm">Detect and prevent raid attacks</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.antiRaidEnabled}
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, antiRaidEnabled: checked }))}
                    />
                  </div>

                  {settings.antiRaidEnabled && (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-300">Join Threshold</Label>
                          <Input
                            type="number"
                            min={5}
                            max={50}
                            value={settings.antiRaidJoinThreshold}
                            onChange={(e) => setSettings(s => ({ ...s, antiRaidJoinThreshold: parseInt(e.target.value) || 10 }))}
                            className="bg-[#1a1d26] border-white/10 text-white"
                          />
                          <p className="text-xs text-gray-500">Members joining to trigger</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Interval (seconds)</Label>
                          <Input
                            type="number"
                            min={10}
                            max={300}
                            value={settings.antiRaidJoinInterval}
                            onChange={(e) => setSettings(s => ({ ...s, antiRaidJoinInterval: parseInt(e.target.value) || 60 }))}
                            className="bg-[#1a1d26] border-white/10 text-white"
                          />
                          <p className="text-xs text-gray-500">Time window</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-300">Min Account Age (days)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={365}
                            value={settings.antiRaidMinAccountAge}
                            onChange={(e) => setSettings(s => ({ ...s, antiRaidMinAccountAge: parseInt(e.target.value) || 7 }))}
                            className="bg-[#1a1d26] border-white/10 text-white"
                          />
                          <p className="text-xs text-gray-500">Flag accounts younger than this</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300">Action</Label>
                          <Select
                            value={settings.antiRaidAction}
                            onValueChange={(v) => setSettings(s => ({ ...s, antiRaidAction: v as ModerationSettings['antiRaidAction'] }))}
                          >
                            <SelectTrigger className="bg-[#1a1d26] border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1d26] border-white/10">
                              <SelectItem value="LOCKDOWN" className="text-white hover:bg-white/10">
                                <div className="flex items-center gap-2">
                                  <Lock className="w-4 h-4 text-red-400" />
                                  Server Lockdown
                                </div>
                              </SelectItem>
                              <SelectItem value="KICK_NEW" className="text-white hover:bg-white/10">
                                <div className="flex items-center gap-2">
                                  <UserX className="w-4 h-4 text-orange-400" />
                                  Kick New Members
                                </div>
                              </SelectItem>
                              <SelectItem value="BAN_NEW" className="text-white hover:bg-white/10">
                                <div className="flex items-center gap-2">
                                  <Ban className="w-4 h-4 text-red-500" />
                                  Ban New Members
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Notification Channel</Label>
                        <ChannelSelector
                          value={settings.antiRaidNotifyChannel}
                          onChange={(value) => setSettings(s => ({ ...s, antiRaidNotifyChannel: value }))}
                          channels={channels}
                          placeholder="Select notification channel"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="surface-card border-pink-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-pink-400 flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Raid Detection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-400">
                  <p>• {settings.antiRaidJoinThreshold} joins in {settings.antiRaidJoinInterval}s = raid</p>
                  <p>• Accounts &lt;{settings.antiRaidMinAccountAge} days old flagged</p>
                  <p>• Action: {settings.antiRaidAction.replace('_', ' ')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Invites Tab - Custom Invite Link */}
        <TabsContent value="invites" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Invite Filter */}
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-emerald-400" />
                    <div>
                      <CardTitle className="text-white">Invite Link Filter</CardTitle>
                      <CardDescription className="text-gray-400">Block external server invites</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-white font-medium">Block External Invites</p>
                        <p className="text-gray-400 text-sm">Delete messages with other server invites</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.inviteFilterEnabled}
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, inviteFilterEnabled: checked }))}
                    />
                  </div>

                  {settings.inviteFilterEnabled && (
                    <div className="space-y-4">
                      <Label className="text-gray-300">Whitelisted Server Invites</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newInviteWhitelist}
                          onChange={(e) => setNewInviteWhitelist(e.target.value)}
                          placeholder="Server ID or invite code"
                          className="bg-[#1a1d26] border-white/10 text-white placeholder:text-gray-500"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInviteWhitelist())}
                        />
                        <Button type="button" onClick={addInviteWhitelist} variant="outline" className="border-white/10 text-white hover:bg-white/5">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {settings.inviteFilterWhitelist.map((invite) => (
                          <Badge key={invite} className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            {invite}
                            <button onClick={() => removeInviteWhitelist(invite)} className="ml-1 hover:text-white">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Custom Invite Link */}
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-yellow-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <div>
                      <CardTitle className="text-white">Custom Invite Link</CardTitle>
                      <CardDescription className="text-gray-400">Create a vanity URL for your server (requires Level 3 boost)</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <Alert className="bg-yellow-500/10 border-yellow-500/30">
                    <Crown className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-gray-300">
                      Custom invite links require your server to be Level 3 boosted (14 boosts).
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Link2 className="h-5 w-5 text-yellow-400" />
                      <div>
                        <p className="text-white font-medium">Enable Custom Invite</p>
                        <p className="text-gray-400 text-sm">Use a custom vanity URL</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.customInviteEnabled}
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, customInviteEnabled: checked }))}
                    />
                  </div>

                  {settings.customInviteEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Custom Invite Code</Label>
                        <div className="flex gap-2">
                          <div className="flex items-center px-3 rounded-l-lg bg-[#0f1218] border border-white/10 border-r-0">
                            <span className="text-gray-400 text-sm">discord.gg/</span>
                          </div>
                          <Input
                            value={settings.customInviteCode}
                            onChange={(e) => setSettings(s => ({ ...s, customInviteCode: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                            placeholder="your-server"
                            className="bg-[#1a1d26] border-white/10 text-white rounded-l-none"
                          />
                          <Button
                            variant="outline"
                            onClick={copyCustomInvite}
                            disabled={!settings.customInviteCode}
                            className="border-white/10 text-white hover:bg-white/5"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">Only lowercase letters, numbers, and hyphens allowed</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Invite Channel</Label>
                        <ChannelSelector
                          value={settings.customInviteChannel}
                          onChange={(value) => setSettings(s => ({ ...s, customInviteChannel: value }))}
                          channels={channels}
                          placeholder="Select channel for invite"
                        />
                        <p className="text-xs text-gray-500">Channel where the invite will be created</p>
                      </div>

                      {settings.customInviteCode && (
                        <div className="p-4 rounded-lg bg-[#0f1218] border border-white/10">
                          <Label className="text-gray-400 text-xs mb-2 block">Preview</Label>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Globe className="h-5 w-5 text-[#5865F2]" />
                              <span className="text-white font-mono">discord.gg/{settings.customInviteCode}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://discord.gg/${settings.customInviteCode}`, '_blank')}
                              className="text-gray-400 hover:text-white"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Logging Tab */}
        <TabsContent value="logging" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-cyan-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-cyan-400" />
                    <div>
                      <CardTitle className="text-white">Moderation Logging</CardTitle>
                      <CardDescription className="text-gray-400">Log all moderation actions to a channel</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Mod Log Channel</Label>
                    <ChannelSelector
                      value={settings.modLogChannelId}
                      onChange={(value) => setSettings(s => ({ ...s, modLogChannelId: value }))}
                      channels={channels}
                      placeholder="Select log channel"
                    />
                    <p className="text-xs text-gray-500">All moderation actions will be logged here</p>
                  </div>

                  <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-cyan-400" />
                      Logged Actions
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {['Spam Deleted', 'User Warned', 'User Muted', 'User Kicked', 'User Banned', 'Raid Detected', 'Link Blocked', 'Word Filtered'].map(action => (
                        <span key={action} className="flex items-center gap-2 text-gray-300">
                          <CheckCircle className="h-3 w-3 text-emerald-400" />
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
