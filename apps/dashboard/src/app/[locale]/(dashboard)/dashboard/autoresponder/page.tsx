'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Trash2, Edit2, Zap, Save, Server, Search, AlertCircle, Loader2, AtSign, Reply, Eye,
  Shield, User, Crown, MessageSquare, Settings2, Hash, Clock, ToggleLeft,
  Smile, Heart, Sparkles, Check, X, ChevronRight,
  Filter, Target, Lock, FileText, Mic, Ban
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useGuildContext } from '@/context/guild-context';
import { useGuilds } from '@/hooks';
import { RoleSelector } from '@/components/selectors/role-selector';
import { ChannelSelector, Channel } from '@/components/selectors/channel-selector';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface RoleResponse {
  roleId: string;
  roleName?: string;
  response: string;
}

interface UserResponse {
  userId: string;
  username?: string;
  response: string;
}

interface AutoResponder {
  id: string;
  trigger: string;
  triggerType: 'EXACT' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX' | 'WILDCARD';
  response: string;
  responseType: 'TEXT' | 'EMBED' | 'REACTION' | 'RANDOM';
  cooldownSeconds: number;
  enabled: boolean;

  // Advanced features
  mentionUser?: boolean;
  deleteOriginal?: boolean;
  replyToMessage?: boolean;
  dmUser?: boolean;

  // Tone & Style
  tone?: 'formal' | 'casual' | 'friendly' | 'playful' | 'professional';
  pronoun?: 'neutral' | 'first_person' | 'third_person';
  emoji?: boolean;

  // Role-based responses
  roleResponses?: RoleResponse[];

  // User-specific responses
  userResponses?: UserResponse[];

  // Restrictions
  allowedRoleIds?: string[];
  blockedRoleIds?: string[];
  allowedChannelIds?: string[];
  blockedChannelIds?: string[];
  allowedUserIds?: string[];
  blockedUserIds?: string[];

  // Random responses
  randomResponses?: string[];

  // Metadata
  usageCount?: number;
  lastUsedAt?: string;
  createdAt?: string;
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

const TRIGGER_TYPES = [
  { value: 'EXACT', label: 'Exact Match', icon: Target, description: 'Message must match exactly' },
  { value: 'CONTAINS', label: 'Contains', icon: Search, description: 'Message contains the trigger' },
  { value: 'STARTS_WITH', label: 'Starts With', icon: ChevronRight, description: 'Message starts with trigger' },
  { value: 'ENDS_WITH', label: 'Ends With', icon: ChevronRight, description: 'Message ends with trigger' },
  { value: 'REGEX', label: 'Regex', icon: FileText, description: 'Advanced pattern matching' },
  { value: 'WILDCARD', label: 'Wildcard', icon: Sparkles, description: 'Use * for any text' },
];

const TONES = [
  { value: 'formal', label: 'Formal', icon: Crown, color: 'text-purple-400' },
  { value: 'casual', label: 'Casual', icon: Smile, color: 'text-green-400' },
  { value: 'friendly', label: 'Friendly', icon: Heart, color: 'text-pink-400' },
  { value: 'playful', label: 'Playful', icon: Sparkles, color: 'text-yellow-400' },
  { value: 'professional', label: 'Professional', icon: Shield, color: 'text-blue-400' },
];

const PRONOUNS = [
  { value: 'neutral', label: 'Neutral (Bot)', example: 'The bot says...' },
  { value: 'first_person', label: 'First Person (I/Me)', example: 'I think...' },
  { value: 'third_person', label: 'Third Person (SylaBot)', example: 'SylaBot believes...' },
];

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export default function AutoResponderPage() {
  const [responders, setResponders] = useState<AutoResponder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [_activeTab, _setActiveTab] = useState('overview');

  // Guild data
  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  // Edit/Create State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogTab, setDialogTab] = useState('basic');
  const [formData, setFormData] = useState<Partial<AutoResponder>>({
    trigger: '',
    triggerType: 'CONTAINS',
    response: '',
    responseType: 'TEXT',
    cooldownSeconds: 0,
    enabled: true,
    mentionUser: false,
    deleteOriginal: false,
    replyToMessage: true,
    dmUser: false,
    tone: 'casual',
    pronoun: 'neutral',
    emoji: true,
    roleResponses: [],
    userResponses: [],
    allowedRoleIds: [],
    blockedRoleIds: [],
    allowedChannelIds: [],
    blockedChannelIds: [],
    randomResponses: [],
  });

  const { selectedGuildId, setSelectedGuildId } = useGuildContext();
  const { data: guilds, isLoading: guildsLoading, error: guildsError } = useGuilds();

  // Fetch guild data
  const fetchGuildData = useCallback(async () => {
    if (!selectedGuildId) return;

    try {
      const [rolesRes, channelsRes, respondersRes] = await Promise.all([
        fetch(`/api/guilds/${selectedGuildId}/roles`),
        fetch(`/api/guilds/${selectedGuildId}/channels`),
        fetch(`/api/guilds/${selectedGuildId}/autoresponders`),
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

      if (respondersRes.ok) {
        const { data } = await respondersRes.json();
        setResponders(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch guild data:', error);
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

    try {
      if (editingId) {
        const res = await fetch(`/api/guilds/${selectedGuildId}/autoresponders/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          setResponders(prev => prev.map(r => r.id === editingId ? { ...r, ...formData } as AutoResponder : r));
          toast.success('Responder updated!');
        }
      } else {
        const res = await fetch(`/api/guilds/${selectedGuildId}/autoresponders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (res.ok) {
          setResponders(prev => [data.data, ...prev]);
          toast.success('Responder created!');
        }
      }
      setIsDialogOpen(false);
      resetForm();
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedGuildId) return;
    try {
      await fetch(`/api/guilds/${selectedGuildId}/autoresponders/${id}`, { method: 'DELETE' });
      setResponders(prev => prev.filter(r => r.id !== id));
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    if (!selectedGuildId) return;
    try {
      await fetch(`/api/guilds/${selectedGuildId}/autoresponders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      setResponders(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
      toast.success(enabled ? 'Enabled' : 'Disabled');
    } catch {
      toast.error('Toggle failed');
    }
  };

  const openCreate = () => {
    resetForm();
    setEditingId(null);
    setDialogTab('basic');
    setIsDialogOpen(true);
  };

  const openEdit = (responder: AutoResponder) => {
    setFormData({
      trigger: responder.trigger,
      triggerType: responder.triggerType,
      response: responder.response,
      responseType: responder.responseType,
      cooldownSeconds: responder.cooldownSeconds,
      enabled: responder.enabled,
      mentionUser: responder.mentionUser ?? false,
      deleteOriginal: responder.deleteOriginal ?? false,
      replyToMessage: responder.replyToMessage ?? true,
      dmUser: responder.dmUser ?? false,
      tone: responder.tone ?? 'casual',
      pronoun: responder.pronoun ?? 'neutral',
      emoji: responder.emoji ?? true,
      roleResponses: responder.roleResponses ?? [],
      userResponses: responder.userResponses ?? [],
      allowedRoleIds: responder.allowedRoleIds ?? [],
      blockedRoleIds: responder.blockedRoleIds ?? [],
      allowedChannelIds: responder.allowedChannelIds ?? [],
      blockedChannelIds: responder.blockedChannelIds ?? [],
      randomResponses: responder.randomResponses ?? [],
    });
    setEditingId(responder.id);
    setDialogTab('basic');
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      trigger: '',
      triggerType: 'CONTAINS',
      response: '',
      responseType: 'TEXT',
      cooldownSeconds: 0,
      enabled: true,
      mentionUser: false,
      deleteOriginal: false,
      replyToMessage: true,
      dmUser: false,
      tone: 'casual',
      pronoun: 'neutral',
      emoji: true,
      roleResponses: [],
      userResponses: [],
      allowedRoleIds: [],
      blockedRoleIds: [],
      allowedChannelIds: [],
      blockedChannelIds: [],
      randomResponses: [],
    });
  };

  const addRoleResponse = () => {
    setFormData(prev => ({
      ...prev,
      roleResponses: [...(prev.roleResponses || []), { roleId: '', response: '' }]
    }));
  };

  const removeRoleResponse = (index: number) => {
    setFormData(prev => ({
      ...prev,
      roleResponses: prev.roleResponses?.filter((_, i) => i !== index) || []
    }));
  };

  const updateRoleResponse = (index: number, field: 'roleId' | 'response', value: string) => {
    setFormData(prev => ({
      ...prev,
      roleResponses: prev.roleResponses?.map((r, i) =>
        i === index ? { ...r, [field]: value, roleName: field === 'roleId' ? roles.find(role => role.id === value)?.name : r.roleName } : r
      ) || []
    }));
  };

  const addRandomResponse = () => {
    setFormData(prev => ({
      ...prev,
      randomResponses: [...(prev.randomResponses || []), '']
    }));
  };

  const removeRandomResponse = (index: number) => {
    setFormData(prev => ({
      ...prev,
      randomResponses: prev.randomResponses?.filter((_, i) => i !== index) || []
    }));
  };

  const updateRandomResponse = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      randomResponses: prev.randomResponses?.map((r, i) => i === index ? value : r) || []
    }));
  };

  // Filter responders
  const filteredResponders = responders.filter(r => {
    const matchesSearch = r.trigger.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.response.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterEnabled === 'all' ||
      (filterEnabled === 'enabled' && r.enabled) ||
      (filterEnabled === 'disabled' && !r.enabled);
    return matchesSearch && matchesFilter;
  });

  // Stats
  const stats = {
    total: responders.length,
    enabled: responders.filter(r => r.enabled).length,
    disabled: responders.filter(r => !r.enabled).length,
    totalUsage: responders.reduce((sum, r) => sum + (r.usageCount || 0), 0),
  };

  if (guildsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(174_72%_55%)]" />
      </div>
    );
  }

  if (guildsError || !guilds?.length) {
    return (
      <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {guildsError ? 'Failed to load servers' : 'No servers found. Make sure the bot is in at least one server.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="icon-badge icon-badge-yellow">
            <Reply className="h-7 w-7 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Auto Responder</h1>
            <p className="text-gray-400 mt-1">Create intelligent automatic replies with role-based responses</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={openCreate} className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-medium shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> New Responder
          </Button>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <Server className="h-5 w-5 text-gray-400" />
            <Select value={selectedGuildId || ''} onValueChange={setSelectedGuildId}>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="surface-card border-yellow-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-500/10">
              <Reply className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Responders</p>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <Check className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.enabled}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card border-red-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.disabled}</p>
              <p className="text-xs text-gray-500">Disabled</p>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Zap className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalUsage}</p>
              <p className="text-xs text-gray-500">Total Uses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search triggers or responses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1a1d26] border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          <Select value={filterEnabled} onValueChange={(v: 'all' | 'enabled' | 'disabled') => setFilterEnabled(v)}>
            <SelectTrigger className="w-[140px] bg-[#1a1d26] border-white/10 text-white">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d26] border-white/10">
              <SelectItem value="all" className="text-white">All</SelectItem>
              <SelectItem value="enabled" className="text-white">Enabled</SelectItem>
              <SelectItem value="disabled" className="text-white">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {filteredResponders.length === 0 ? (
        <Card className="surface-card border-dashed">
          <CardContent className="py-12 text-center">
            <Reply className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Auto Responders</h3>
            <p className="text-gray-400 mb-4">Create intelligent auto responses with role-based customization</p>
            <Button onClick={openCreate} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black">
              <Plus className="w-4 h-4 mr-2" /> Create Responder
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResponders.map(responder => (
            <Card key={responder.id} className="surface-card hover:border-yellow-500/30 transition-all duration-300 group overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs ${responder.triggerType === 'EXACT' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                        responder.triggerType === 'REGEX' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}>
                        {responder.triggerType}
                      </Badge>
                      {responder.roleResponses && responder.roleResponses.length > 0 && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          {responder.roleResponses.length} Role{responder.roleResponses.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {responder.randomResponses && responder.randomResponses.length > 0 && (
                        <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30 text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Random
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg truncate text-white font-mono">"{responder.trigger}"</CardTitle>
                  </div>
                  <Switch
                    checked={responder.enabled}
                    onCheckedChange={(checked) => handleToggle(responder.id, checked)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-3 rounded-lg bg-[#0f1218] border border-white/5">
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {responder.mentionUser && <span className="text-blue-400">@user </span>}
                    {responder.response}
                  </p>
                </div>

                {/* Features badges */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {responder.mentionUser && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                      <AtSign className="w-3 h-3" /> Mention
                    </span>
                  )}
                  {responder.replyToMessage && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
                      <Reply className="w-3 h-3" /> Reply
                    </span>
                  )}
                  {responder.dmUser && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs">
                      <MessageSquare className="w-3 h-3" /> DM
                    </span>
                  )}
                  {responder.deleteOriginal && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs">
                      <Trash2 className="w-3 h-3" /> Delete
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {responder.cooldownSeconds}s
                    </span>
                    {responder.usageCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-400" /> {responder.usageCount} uses
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(responder)} className="h-8 w-8 hover:bg-white/5">
                      <Edit2 className="w-4 h-4 text-blue-400" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(responder.id)} className="h-8 w-8 hover:bg-white/5">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#1a1d26] text-white border-white/10 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Reply className="h-5 w-5 text-yellow-400" />
              {editingId ? 'Edit Responder' : 'Create Auto Responder'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure intelligent automatic responses with role-based customization
            </DialogDescription>
          </DialogHeader>

          <Tabs value={dialogTab} onValueChange={setDialogTab} className="mt-4">
            <TabsList className="bg-[#0f1218] border border-white/10 p-1 w-full grid grid-cols-4">
              <TabsTrigger value="basic" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
                <Settings2 className="w-4 h-4 mr-2" /> Basic
              </TabsTrigger>
              <TabsTrigger value="roles" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                <Shield className="w-4 h-4 mr-2" /> Roles
              </TabsTrigger>
              <TabsTrigger value="style" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400">
                <Sparkles className="w-4 h-4 mr-2" /> Style
              </TabsTrigger>
              <TabsTrigger value="restrictions" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                <Lock className="w-4 h-4 mr-2" /> Access
              </TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Trigger Phrase *</Label>
                  <Input
                    value={formData.trigger}
                    onChange={e => setFormData(p => ({ ...p, trigger: e.target.value }))}
                    placeholder="hello bot"
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Match Type</Label>
                  <Select
                    value={formData.triggerType}
                    onValueChange={(v) => setFormData(p => ({ ...p, triggerType: v as AutoResponder['triggerType'] }))}
                  >
                    <SelectTrigger className="bg-[#0f1218] border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d26] border-white/10">
                      {TRIGGER_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value} className="text-white hover:bg-white/10">
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4 text-gray-400" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Default Response *</Label>
                <Textarea
                  value={formData.response}
                  onChange={e => setFormData(p => ({ ...p, response: e.target.value }))}
                  placeholder="Hello! How can I help you today?"
                  className="bg-[#0f1218] border-white/10 text-white min-h-[100px]"
                />
                <p className="text-xs text-gray-500">
                  Variables: {'{user}'} {'{username}'} {'{server}'} {'{channel}'} {'{time}'}
                </p>
              </div>

              {/* Response Type */}
              <div className="space-y-2">
                <Label className="text-gray-300">Response Type</Label>
                <Select
                  value={formData.responseType}
                  onValueChange={(v) => setFormData(p => ({ ...p, responseType: v as AutoResponder['responseType'] }))}
                >
                  <SelectTrigger className="bg-[#0f1218] border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d26] border-white/10">
                    <SelectItem value="TEXT" className="text-white hover:bg-white/10">Text Message</SelectItem>
                    <SelectItem value="EMBED" className="text-white hover:bg-white/10">Embed</SelectItem>
                    <SelectItem value="REACTION" className="text-white hover:bg-white/10">Reaction Only</SelectItem>
                    <SelectItem value="RANDOM" className="text-white hover:bg-white/10">Random Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Random Responses */}
              {formData.responseType === 'RANDOM' && (
                <div className="space-y-3 p-4 rounded-lg bg-pink-500/5 border border-pink-500/20">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-pink-400" />
                    Random Responses
                  </Label>
                  {formData.randomResponses?.map((response, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 mt-3 w-6">{idx + 1}.</span>
                      <Textarea
                        value={response}
                        onChange={e => updateRandomResponse(idx, e.target.value)}
                        placeholder={`Response ${idx + 1}`}
                        className="bg-[#0f1218] border-white/10 text-white flex-1 min-h-[60px]"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRandomResponse(idx)}
                        className="text-red-400 hover:bg-red-500/10 mt-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addRandomResponse}
                    className="text-pink-400 hover:bg-pink-500/10"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Response
                  </Button>
                </div>
              )}

              {/* Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <AtSign className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-gray-300">Mention User</span>
                  </div>
                  <Switch
                    checked={formData.mentionUser}
                    onCheckedChange={c => setFormData(p => ({ ...p, mentionUser: c }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <Reply className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-gray-300">Reply to Message</span>
                  </div>
                  <Switch
                    checked={formData.replyToMessage}
                    onCheckedChange={c => setFormData(p => ({ ...p, replyToMessage: c }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-gray-300">Send via DM</span>
                  </div>
                  <Switch
                    checked={formData.dmUser}
                    onCheckedChange={c => setFormData(p => ({ ...p, dmUser: c }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-gray-300">Delete Original</span>
                  </div>
                  <Switch
                    checked={formData.deleteOriginal}
                    onCheckedChange={c => setFormData(p => ({ ...p, deleteOriginal: c }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-400" />
                    Cooldown (seconds)
                  </Label>
                  <Input
                    type="number"
                    value={formData.cooldownSeconds}
                    onChange={e => setFormData(p => ({ ...p, cooldownSeconds: parseInt(e.target.value) || 0 }))}
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 h-fit mt-auto">
                  <div className="flex items-center gap-2">
                    <ToggleLeft className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-gray-300">Enabled</span>
                  </div>
                  <Switch
                    checked={formData.enabled}
                    onCheckedChange={c => setFormData(p => ({ ...p, enabled: c }))}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Role-based Responses Tab */}
            <TabsContent value="roles" className="space-y-4 mt-4">
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <Shield className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-gray-300">
                  Different roles can receive different responses. If a user has multiple roles, the highest priority role response is used.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Label className="text-gray-300 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-400" />
                  Role-Specific Responses
                </Label>

                {formData.roleResponses?.map((roleResponse, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        Response #{idx + 1}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRoleResponse(idx)}
                        className="text-red-400 hover:bg-red-500/10 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-400 text-sm">Select Role</Label>
                      <Select
                        value={roleResponse.roleId}
                        onValueChange={(v) => updateRoleResponse(idx, 'roleId', v)}
                      >
                        <SelectTrigger className="bg-[#0f1218] border-white/10 text-white">
                          <SelectValue placeholder="Choose a role" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d26] border-white/10">
                          {roles.filter(r => r.name !== '@everyone').map(role => (
                            <SelectItem key={role.id} value={role.id} className="text-white hover:bg-white/10">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99aab5' }}
                                />
                                {role.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-400 text-sm">Custom Response for this Role</Label>
                      <Textarea
                        value={roleResponse.response}
                        onChange={e => updateRoleResponse(idx, 'response', e.target.value)}
                        placeholder="Special response for this role..."
                        className="bg-[#0f1218] border-white/10 text-white min-h-[80px]"
                      />
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={addRoleResponse}
                  className="w-full border-dashed border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Role Response
                </Button>
              </div>
            </TabsContent>

            {/* Style Tab */}
            <TabsContent value="style" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Mic className="h-4 w-4 text-pink-400" />
                    Tone of Voice
                  </Label>
                  <div className="grid grid-cols-5 gap-2">
                    {TONES.map(tone => (
                      <button
                        key={tone.value}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, tone: tone.value as AutoResponder['tone'] }))}
                        className={`p-3 rounded-lg border text-center transition-all ${formData.tone === tone.value
                          ? 'bg-white/10 border-white/30'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                      >
                        <tone.icon className={`w-5 h-5 mx-auto mb-1 ${tone.color}`} />
                        <span className="text-xs text-gray-300">{tone.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-400" />
                    Pronoun Style
                  </Label>
                  <div className="space-y-2">
                    {PRONOUNS.map(pronoun => (
                      <button
                        key={pronoun.value}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, pronoun: pronoun.value as AutoResponder['pronoun'] }))}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${formData.pronoun === pronoun.value
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white">{pronoun.label}</span>
                          <span className="text-xs text-gray-500 italic">{pronoun.example}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <Smile className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="text-white font-medium">Use Emojis</p>
                      <p className="text-gray-400 text-sm">Add emojis to responses</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.emoji}
                    onCheckedChange={c => setFormData(p => ({ ...p, emoji: c }))}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Restrictions Tab */}
            <TabsContent value="restrictions" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    Allowed Roles (Whitelist)
                  </Label>
                  <RoleSelector
                    roles={roles}
                    value={formData.allowedRoleIds || []}
                    onChange={(v) => setFormData(p => ({ ...p, allowedRoleIds: v as string[] }))}
                    placeholder="Leave empty for all roles"
                    multiple
                  />
                  <p className="text-xs text-gray-500">Only these roles can trigger this response</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Ban className="h-4 w-4 text-red-400" />
                    Blocked Roles (Blacklist)
                  </Label>
                  <RoleSelector
                    roles={roles}
                    value={formData.blockedRoleIds || []}
                    onChange={(v) => setFormData(p => ({ ...p, blockedRoleIds: v as string[] }))}
                    placeholder="No blocked roles"
                    multiple
                  />
                  <p className="text-xs text-gray-500">These roles cannot trigger this response</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-blue-400" />
                    Allowed Channels
                  </Label>
                  <ChannelSelector
                    channels={channels}
                    value={formData.allowedChannelIds?.[0] || ''}
                    onChange={(v) => setFormData(p => ({ ...p, allowedChannelIds: v ? [v] : [] }))}
                    placeholder="All channels"
                  />
                  <p className="text-xs text-gray-500">Only works in these channels</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-red-400" />
                    Blocked Channels
                  </Label>
                  <ChannelSelector
                    channels={channels}
                    value={formData.blockedChannelIds?.[0] || ''}
                    onChange={(v) => setFormData(p => ({ ...p, blockedChannelIds: v ? [v] : [] }))}
                    placeholder="No blocked channels"
                  />
                  <p className="text-xs text-gray-500">Won't work in these channels</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Preview */}
          {formData.response && (
            <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
              <Label className="text-gray-300 flex items-center gap-2">
                <Eye className="h-4 w-4 text-cyan-400" />
                Preview
              </Label>
              <div className="discord-preview p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-lg shrink-0">
                    🤖
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-yellow-400">SylaBot</span>
                      <Badge className="bg-[#5865F2] text-white text-[10px] px-1 py-0">BOT</Badge>
                      <span className="text-xs text-gray-500">Today at {new Date().toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-1 text-[#DBDEE1]">
                      {formData.mentionUser && <span className="text-blue-400 bg-blue-500/20 rounded px-1">@User</span>}{' '}
                      {formData.response
                        .replace('{user}', '@User')
                        .replace('{username}', 'User')
                        .replace('{server}', 'My Server')
                        .replace('{channel}', '#general')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-white/10 hover:bg-white/5 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.trigger || !formData.response}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingId ? 'Update' : 'Create'} Responder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
