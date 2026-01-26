'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Save, Zap, AlertCircle, Server, Trophy, Users, MessageSquare, Volume2, 
  Settings, Sparkles, Star, TrendingUp, Shield, Clock, Hash, ChevronRight, Eye, Gauge,
  Plus, Trash2, Edit2, Crown, Target, Gift, Calendar, CheckCircle2, Award, Medal,
  Layers, Calculator, BarChart3, Percent, ArrowUpRight, RefreshCw, Table
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ChannelSelector } from '@/components/selectors/channel-selector';
import { RoleSelector } from '@/components/selectors/role-selector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useGuildContext } from '@/context/guild-context';
import { useGuilds, useGuildChannels } from '@/hooks';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface LevelRole {
  id?: string;
  level: number;
  roleId?: string;
  roleName: string;
  roleEmoji: string;
  roleColor: string;
  autoCreate: boolean;
}

interface DailyQuest {
  id: string;
  name: string;
  description: string;
  type: 'MESSAGE' | 'VOICE' | 'REACTION' | 'FORUM_POST' | 'IMAGE_POST' | 'CUSTOM';
  requirement: number;
  xpReward: number;
  enabled: boolean;
  channelId?: string;
  emoji: string;
}

interface RoleMultiplier {
  roleId: string;
  roleName?: string;
  multiplier: number;
}

interface CustomLevelXp {
  level: number;
  xp: number;
}

interface GuildStats {
  totalMembers: number;
  totalXp: number;
  totalMessages: number;
  avgLevel: number;
  topLevel: number;
  activeToday: number;
}

interface Role {
  id: string;
  name: string;
  color: number;
}

// ═══════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════

const LEVELUP_TEMPLATES = [
  { id: 'celebration', name: '🎉 Celebration', message: '🎉 **LEVEL UP!** 🎉\n\n{user} just reached **Level {level}**!\nKeep up the great work! 🚀' },
  { id: 'gaming', name: '🎮 Gaming Style', message: '🎮 **ACHIEVEMENT UNLOCKED!** 🎮\n\n{user} has leveled up to **Level {level}**!\n⭐ Total XP: {xp}\nGG! 🏆' },
  { id: 'minimal', name: '📝 Minimal', message: '{user} reached level {level}.' },
  { id: 'anime', name: '✨ Anime Style', message: '✨ **POWER UP!** ✨\n\n{user} has ascended to **Level {level}**!\n(ノ◕ヮ◕)ノ*:・゚✧\n🌟 Your power level is over {xp}!' },
];

const FORMULA_PRESETS = [
  { id: 'linear', name: 'Linear', formula: 'level × baseXP', description: 'Simple linear progression', example: '1→100, 2→200' },
  { id: 'exponential', name: 'Exponential', formula: 'baseXP × multiplier^level', description: 'Gets harder each level', example: '1→100, 2→150' },
  { id: 'mee6', name: 'MEE6 Style', formula: '5×level² + 50×level + 100', description: 'Popular bot formula', example: '1→155, 2→220' },
  { id: 'custom', name: 'Custom', formula: 'Manual per level', description: 'Set XP for each level', example: 'You decide!' },
];

const DEFAULT_LEVEL_ROLES: LevelRole[] = [
  { level: 5, roleName: 'Newcomer', roleEmoji: '🌱', roleColor: '#43b581', autoCreate: true },
  { level: 10, roleName: 'Regular', roleEmoji: '⭐', roleColor: '#faa61a', autoCreate: true },
  { level: 25, roleName: 'Active', roleEmoji: '🔥', roleColor: '#f04747', autoCreate: true },
  { level: 50, roleName: 'Veteran', roleEmoji: '💎', roleColor: '#9b59b6', autoCreate: true },
  { level: 100, roleName: 'Legend', roleEmoji: '👑', roleColor: '#f1c40f', autoCreate: true },
];

const DEFAULT_DAILY_QUESTS: DailyQuest[] = [
  { id: '1', name: 'Daily Hello', description: 'Say hello in any channel', type: 'MESSAGE', requirement: 1, xpReward: 50, enabled: true, emoji: '👋' },
  { id: '2', name: 'Chatterbox', description: 'Send 10 messages', type: 'MESSAGE', requirement: 10, xpReward: 100, enabled: true, emoji: '💬' },
  { id: '3', name: 'Voice Active', description: 'Spend 10 minutes in voice', type: 'VOICE', requirement: 10, xpReward: 150, enabled: false, emoji: '🎤' },
  { id: '4', name: 'Forum Contributor', description: 'Create a forum post', type: 'FORUM_POST', requirement: 1, xpReward: 200, enabled: false, emoji: '📝' },
  { id: '5', name: 'Showcase Artist', description: 'Post an image in showcase', type: 'IMAGE_POST', requirement: 1, xpReward: 100, enabled: false, emoji: '🎨' },
];

// ═══════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════

function calculateXpForLevel(level: number, formula: string, baseXp: number, multiplier: number, customLevels: CustomLevelXp[]): number {
  // Check custom levels first
  const custom = customLevels.find(c => c.level === level);
  if (custom) return custom.xp;
  
  switch (formula) {
    case 'linear':
      return level * baseXp;
    case 'exponential':
      return Math.floor(baseXp * Math.pow(multiplier, level - 1));
    case 'mee6':
      return 5 * level * level + 50 * level + 100;
    case 'custom':
      // Interpolate if level not found
      const sorted = [...customLevels].sort((a, b) => a.level - b.level);
      if (sorted.length === 0) return level * 100;
      const lower = sorted.filter(c => c.level <= level).pop();
      const upper = sorted.find(c => c.level > level);
      if (!lower) return sorted[0]?.xp || level * 100;
      if (!upper) return lower.xp + (level - lower.level) * 50;
      const ratio = (level - lower.level) / (upper.level - lower.level);
      return Math.floor(lower.xp + ratio * (upper.xp - lower.xp));
    default:
      return level * 100;
  }
}

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export default function LevelingPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Guild data
  const [roles, setRoles] = useState<Role[]>([]);
  const [channels, setChannels] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [stats, setStats] = useState<GuildStats>({
    totalMembers: 0,
    totalXp: 0,
    totalMessages: 0,
    avgLevel: 0,
    topLevel: 0,
    activeToday: 0,
  });

  // Settings
  const [settings, setSettings] = useState({
    levelingEnabled: true,
    xpMin: 15,
    xpMax: 25,
    xpCooldownSeconds: 60,
    levelUpChannelId: '',
    levelUpDmEnabled: false,
    levelUpMessage: '🎉 {user} reached **Level {level}**!',
    voiceXpEnabled: false,
    voiceXpPerMinute: 5,
    // Formula settings
    xpFormula: 'mee6',
    baseXp: 100,
    xpMultiplier: 1.5,
  });

  // Role Multipliers
  const [roleMultipliers, setRoleMultipliers] = useState<RoleMultiplier[]>([
    { roleId: 'booster', roleName: 'Server Boosters', multiplier: 1.5 },
  ]);
  const [showMultiplierDialog, setShowMultiplierDialog] = useState(false);
  const [editingMultiplier, setEditingMultiplier] = useState<RoleMultiplier | null>(null);

  // Custom Level XP
  const [customLevelXp, setCustomLevelXp] = useState<CustomLevelXp[]>([
    { level: 1, xp: 100 },
    { level: 2, xp: 155 },
    { level: 3, xp: 220 },
    { level: 4, xp: 295 },
    { level: 5, xp: 380 },
  ]);

  // Level Roles
  const [levelRoles, setLevelRoles] = useState<LevelRole[]>(DEFAULT_LEVEL_ROLES);
  const [showLevelRoleDialog, setShowLevelRoleDialog] = useState(false);
  const [editingLevelRole, setEditingLevelRole] = useState<LevelRole | null>(null);

  // Daily Quests
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>(DEFAULT_DAILY_QUESTS);
  const [showQuestDialog, setShowQuestDialog] = useState(false);
  const [editingQuest, setEditingQuest] = useState<DailyQuest | null>(null);
  
  const { selectedGuildId, setSelectedGuildId } = useGuildContext();
  const { data: guilds, isLoading: guildsLoading, error: guildsError } = useGuilds();

  // Fetch guild data
  const fetchGuildData = useCallback(async () => {
    if (!selectedGuildId) return;
    setLoading(true);
    
    try {
      const [rolesRes, channelsRes, statsRes] = await Promise.all([
        fetch(`/api/guilds/${selectedGuildId}/roles`),
        fetch(`/api/guilds/${selectedGuildId}/channels`),
        fetch(`/api/guilds/${selectedGuildId}/stats`),
      ]);
      
      if (rolesRes.ok) {
        const { data } = await rolesRes.json();
        setRoles(data || []);
      }
      
      if (channelsRes.ok) {
        const { data } = await channelsRes.json();
        setChannels(data?.filter((c: { type: string }) => c.type === 'text') || []);
      }
      
      if (statsRes.ok) {
        const { data } = await statsRes.json();
        if (data) {
          setStats({
            totalMembers: data.totalMembers || data.stats?.members || 0,
            totalXp: data.totalXp || 0,
            totalMessages: data.totalMessages || 0,
            avgLevel: data.avgLevel || 0,
            topLevel: data.topLevel || 0,
            activeToday: data.activeToday || 0,
          });
        }
      }

      // Fetch leveling settings
      const levelingRes = await fetch(`/api/guilds/${selectedGuildId}/leveling`);
      if (levelingRes.ok) {
        const { data } = await levelingRes.json();
        if (data) {
          setSettings(prev => ({
            ...prev,
            levelingEnabled: data.levelingEnabled ?? true,
            xpMin: data.xpMin || 15,
            xpMax: data.xpMax || 25,
            xpCooldownSeconds: data.xpCooldownSeconds || 60,
            levelUpChannelId: data.levelUpChannelId || '',
            levelUpDmEnabled: data.levelUpDmEnabled || false,
            levelUpMessage: data.levelUpMessage || '🎉 {user} reached **Level {level}**!',
            voiceXpEnabled: data.voiceXpEnabled || false,
            voiceXpPerMinute: data.voiceXpPerMinute || 5,
          }));
          if (data.levelRoles?.length) setLevelRoles(data.levelRoles);
          if (data.dailyQuests?.length) setDailyQuests(data.dailyQuests);
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
      const res = await fetch(`/api/guilds/${selectedGuildId}/leveling`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          levelRoles,
          dailyQuests,
          roleMultipliers,
          customLevelXp: settings.xpFormula === 'custom' ? customLevelXp : undefined,
        }),
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

  // Multiplier handlers
  const openAddMultiplier = () => {
    setEditingMultiplier({ roleId: '', multiplier: 1.5 });
    setShowMultiplierDialog(true);
  };

  const saveMultiplier = () => {
    if (!editingMultiplier || !editingMultiplier.roleId) return;
    
    const role = roles.find(r => r.id === editingMultiplier.roleId);
    const newMultiplier = { ...editingMultiplier, roleName: role?.name };
    
    const existingIndex = roleMultipliers.findIndex(m => m.roleId === editingMultiplier.roleId);
    if (existingIndex >= 0) {
      setRoleMultipliers(prev => prev.map((m, i) => i === existingIndex ? newMultiplier : m));
    } else {
      setRoleMultipliers(prev => [...prev, newMultiplier]);
    }
    setShowMultiplierDialog(false);
    setEditingMultiplier(null);
  };

  const deleteMultiplier = (roleId: string) => {
    setRoleMultipliers(prev => prev.filter(m => m.roleId !== roleId));
  };

  // Custom Level XP handlers
  const addCustomLevel = () => {
    const maxLevel = Math.max(...customLevelXp.map(c => c.level), 0);
    const lastXp = customLevelXp.find(c => c.level === maxLevel)?.xp || 100;
    setCustomLevelXp(prev => [...prev, { level: maxLevel + 1, xp: lastXp + 100 }].sort((a, b) => a.level - b.level));
  };

  const updateCustomLevel = (level: number, xp: number) => {
    setCustomLevelXp(prev => prev.map(c => c.level === level ? { ...c, xp } : c));
  };

  const removeCustomLevel = (level: number) => {
    setCustomLevelXp(prev => prev.filter(c => c.level !== level));
  };

  // Level Role handlers
  const openAddLevelRole = () => {
    setEditingLevelRole({
      level: Math.max(...levelRoles.map(r => r.level), 0) + 10,
      roleName: 'New Role',
      roleEmoji: '⭐',
      roleColor: '#5865f2',
      autoCreate: true,
    });
    setShowLevelRoleDialog(true);
  };

  const openEditLevelRole = (role: LevelRole) => {
    setEditingLevelRole({ ...role });
    setShowLevelRoleDialog(true);
  };

  const saveLevelRole = () => {
    if (!editingLevelRole) return;
    
    const existingIndex = levelRoles.findIndex(r => r.level === editingLevelRole.level && r.id === editingLevelRole.id);
    if (existingIndex >= 0) {
      setLevelRoles(prev => prev.map((r, i) => i === existingIndex ? editingLevelRole : r));
    } else {
      setLevelRoles(prev => [...prev, editingLevelRole].sort((a, b) => a.level - b.level));
    }
    setShowLevelRoleDialog(false);
    setEditingLevelRole(null);
  };

  const deleteLevelRole = (level: number) => {
    setLevelRoles(prev => prev.filter(r => r.level !== level));
  };

  // Quest handlers
  const openAddQuest = () => {
    setEditingQuest({
      id: Date.now().toString(),
      name: 'New Quest',
      description: 'Complete this quest for bonus XP',
      type: 'MESSAGE',
      requirement: 1,
      xpReward: 50,
      enabled: true,
      emoji: '🎯',
    });
    setShowQuestDialog(true);
  };

  const openEditQuest = (quest: DailyQuest) => {
    setEditingQuest({ ...quest });
    setShowQuestDialog(true);
  };

  const saveQuest = () => {
    if (!editingQuest) return;
    
    const existingIndex = dailyQuests.findIndex(q => q.id === editingQuest.id);
    if (existingIndex >= 0) {
      setDailyQuests(prev => prev.map((q, i) => i === existingIndex ? editingQuest : q));
    } else {
      setDailyQuests(prev => [...prev, editingQuest]);
    }
    setShowQuestDialog(false);
    setEditingQuest(null);
  };

  const deleteQuest = (id: string) => {
    setDailyQuests(prev => prev.filter(q => q.id !== id));
  };

  const toggleQuest = (id: string) => {
    setDailyQuests(prev => prev.map(q => q.id === id ? { ...q, enabled: !q.enabled } : q));
  };

  // Generate XP table preview
  const xpTablePreview = Array.from({ length: 20 }, (_, i) => ({
    level: i + 1,
    xp: calculateXpForLevel(i + 1, settings.xpFormula, settings.baseXp, settings.xpMultiplier, customLevelXp),
  }));

  if (guildsLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
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
          <div className="icon-badge icon-badge-yellow">
            <Zap className="h-7 w-7 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Leveling System</h1>
            <p className="text-gray-400 mt-1">Reward active members with XP, roles, and daily quests</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="surface-card border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-xl font-bold text-white">{stats.totalMembers}</p>
                <p className="text-xs text-gray-500">Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="surface-card border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-xl font-bold text-white">{stats.totalXp.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total XP</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="surface-card border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-xl font-bold text-white">{stats.totalMessages.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="surface-card border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-xl font-bold text-white">{stats.avgLevel}</p>
                <p className="text-xs text-gray-500">Avg Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="surface-card border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-xl font-bold text-white">{stats.topLevel}</p>
                <p className="text-xs text-gray-500">Top Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="surface-card border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-xl font-bold text-white">{stats.activeToday}</p>
                <p className="text-xs text-gray-500">Active Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[hsl(200_22%_16%)] border border-[hsl(200_20%_25%)] p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400 rounded-md">
            <Layers className="w-4 h-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="formula" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 rounded-md">
            <Calculator className="w-4 h-4 mr-2" /> XP Formula
          </TabsTrigger>
          <TabsTrigger value="multipliers" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400 rounded-md">
            <Percent className="w-4 h-4 mr-2" /> Multipliers
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 rounded-md">
            <Crown className="w-4 h-4 mr-2" /> Level Roles
          </TabsTrigger>
          <TabsTrigger value="quests" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-md">
            <Target className="w-4 h-4 mr-2" /> Daily Quests
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 rounded-md">
            <MessageSquare className="w-4 h-4 mr-2" /> Messages
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Enable Toggle */}
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <div>
                      <CardTitle className="text-white">System Status</CardTitle>
                      <CardDescription className="text-gray-400">Enable or disable the leveling system</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      <div>
                        <p className="text-white font-medium">Enable Leveling</p>
                        <p className="text-gray-400 text-sm">Members earn XP for chatting</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.levelingEnabled}
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, levelingEnabled: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* XP Settings */}
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-yellow-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <div>
                      <CardTitle className="text-white">XP Configuration</CardTitle>
                      <CardDescription className="text-gray-400">Configure how much XP users earn per message</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        Min XP per message
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={settings.xpMin}
                        onChange={e => setSettings(s => ({ ...s, xpMin: parseInt(e.target.value) || 15 }))}
                        className="bg-[#1a1d26] border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-400" />
                        Max XP per message
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={settings.xpMax}
                        onChange={e => setSettings(s => ({ ...s, xpMax: parseInt(e.target.value) || 25 }))}
                        className="bg-[#1a1d26] border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-400" />
                        Cooldown (seconds)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={300}
                        value={settings.xpCooldownSeconds}
                        onChange={e => setSettings(s => ({ ...s, xpCooldownSeconds: parseInt(e.target.value) || 60 }))}
                        className="bg-[#1a1d26] border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      <Gauge className="h-5 w-5 text-yellow-400" />
                      <p className="text-sm text-gray-300">
                        Users will earn <span className="text-yellow-400 font-bold">{settings.xpMin} - {settings.xpMax} XP</span> per message, 
                        with a <span className="text-orange-400 font-bold">{settings.xpCooldownSeconds}s</span> cooldown.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Voice XP */}
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-blue-400" />
                    <div>
                      <CardTitle className="text-white">Voice XP</CardTitle>
                      <CardDescription className="text-gray-400">Reward members for voice activity</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Volume2 className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="text-white font-medium">Enable Voice XP</p>
                        <p className="text-gray-400 text-sm">Earn XP for time in voice channels</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.voiceXpEnabled}
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, voiceXpEnabled: checked }))}
                    />
                  </div>

                  {settings.voiceXpEnabled && (
                    <div className="space-y-2">
                      <Label className="text-gray-300">XP per minute in voice</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={settings.voiceXpPerMinute}
                        onChange={e => setSettings(s => ({ ...s, voiceXpPerMinute: parseInt(e.target.value) || 5 }))}
                        className="bg-[#1a1d26] border-white/10 text-white max-w-[200px]"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="surface-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-yellow-400 flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4" />
                    Quick Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-400">
                  <p>• Set cooldown to prevent spam abuse</p>
                  <p>• Use daily quests to boost engagement</p>
                  <p>• Level roles motivate members</p>
                  <p>• Role multipliers reward supporters</p>
                </CardContent>
              </Card>

              <Card className="surface-card border-amber-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-amber-400 flex items-center gap-2 text-sm">
                    <Crown className="h-4 w-4" />
                    Level Roles Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {levelRoles.slice(0, 5).map(role => (
                    <div key={role.level} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{role.roleEmoji}</span>
                        <span className="text-sm text-gray-300">{role.roleName}</span>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        Lv.{role.level}
                      </Badge>
                    </div>
                  ))}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-gray-400 hover:text-white"
                    onClick={() => setActiveTab('roles')}
                  >
                    View All <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* XP Formula Tab */}
        <TabsContent value="formula" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Calculator className="w-5 h-5 text-purple-400" />
                    <div>
                      <CardTitle className="text-white">XP Formula</CardTitle>
                      <CardDescription className="text-gray-400">Choose how XP requirements scale with level</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {FORMULA_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => setSettings(s => ({ ...s, xpFormula: preset.id }))}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          settings.xpFormula === preset.id
                            ? 'bg-purple-500/10 border-purple-500/30'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <p className="text-white font-medium mb-1">{preset.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{preset.formula}</p>
                        <p className="text-xs text-gray-400 mt-2">{preset.example}</p>
                      </button>
                    ))}
                  </div>

                  {settings.xpFormula !== 'custom' && settings.xpFormula !== 'mee6' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Base XP</Label>
                        <Input
                          type="number"
                          value={settings.baseXp}
                          onChange={e => setSettings(s => ({ ...s, baseXp: parseInt(e.target.value) || 100 }))}
                          className="bg-[#1a1d26] border-white/10 text-white"
                        />
                        <p className="text-xs text-gray-500">Starting XP value</p>
                      </div>
                      {settings.xpFormula === 'exponential' && (
                        <div className="space-y-2">
                          <Label className="text-gray-300">Multiplier</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={settings.xpMultiplier}
                            onChange={e => setSettings(s => ({ ...s, xpMultiplier: parseFloat(e.target.value) || 1.5 }))}
                            className="bg-[#1a1d26] border-white/10 text-white"
                          />
                          <p className="text-xs text-gray-500">Growth rate</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom XP per level */}
                  {settings.xpFormula === 'custom' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-300 flex items-center gap-2">
                          <Table className="h-4 w-4 text-purple-400" />
                          Custom XP per Level
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addCustomLevel}
                          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Level
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto p-2">
                        {customLevelXp.sort((a, b) => a.level - b.level).map(({ level, xp }) => (
                          <div key={level} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                Lv.{level}
                              </Badge>
                              <button
                                onClick={() => removeCustomLevel(level)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            <Input
                              type="number"
                              value={xp}
                              onChange={e => updateCustomLevel(level, parseInt(e.target.value) || 0)}
                              className="bg-[#0f1218] border-white/10 text-white text-sm h-8"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* XP Table Preview */}
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <div>
                      <CardTitle className="text-white">XP Requirements Table</CardTitle>
                      <CardDescription className="text-gray-400">Preview of XP needed per level</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-[#1a1d26]">
                        <tr className="border-b border-white/10">
                          <th className="text-left text-gray-400 text-sm pb-3 px-2">Level</th>
                          <th className="text-right text-gray-400 text-sm pb-3 px-2">XP Required</th>
                          <th className="text-right text-gray-400 text-sm pb-3 px-2">Total XP</th>
                          <th className="text-right text-gray-400 text-sm pb-3 px-2">Messages*</th>
                        </tr>
                      </thead>
                      <tbody>
                        {xpTablePreview.map((row, idx) => {
                          const totalXp = xpTablePreview.slice(0, idx + 1).reduce((sum, r) => sum + r.xp, 0);
                          const avgXp = (settings.xpMin + settings.xpMax) / 2;
                          const messages = Math.ceil(row.xp / avgXp);
                          const levelRole = levelRoles.find(r => r.level === row.level);
                          
                          return (
                            <tr key={row.level} className="border-b border-white/5 hover:bg-white/5">
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-medium">{row.level}</span>
                                  {levelRole && (
                                    <Badge className="text-xs" style={{ backgroundColor: `${levelRole.roleColor}20`, color: levelRole.roleColor }}>
                                      {levelRole.roleEmoji} {levelRole.roleName}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="text-right text-yellow-400 font-mono py-3 px-2">{row.xp.toLocaleString()}</td>
                              <td className="text-right text-gray-400 font-mono py-3 px-2">{totalXp.toLocaleString()}</td>
                              <td className="text-right text-gray-500 font-mono py-3 px-2">~{messages}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">* Approximate messages based on avg XP ({Math.round((settings.xpMin + settings.xpMax) / 2)} per message)</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="surface-card border-purple-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-purple-400 flex items-center gap-2 text-sm">
                    <Calculator className="h-4 w-4" />
                    Formula Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-400">
                  <p><strong className="text-white">Linear:</strong> Simple, predictable progression</p>
                  <p><strong className="text-white">Exponential:</strong> Easy start, harder later</p>
                  <p><strong className="text-white">MEE6:</strong> Industry standard formula</p>
                  <p><strong className="text-white">Custom:</strong> Full control per level</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Multipliers Tab */}
        <TabsContent value="multipliers" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">XP Multipliers</h2>
              <p className="text-gray-400 text-sm">Give certain roles bonus XP to reward supporters</p>
            </div>
            <Button onClick={openAddMultiplier} className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Multiplier
            </Button>
          </div>

          <Alert className="bg-pink-500/10 border-pink-500/30">
            <Percent className="h-4 w-4 text-pink-400" />
            <AlertDescription className="text-gray-300">
              Members with multiplier roles earn bonus XP. If they have multiple roles, the highest multiplier is used.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roleMultipliers.map(mult => {
              const role = roles.find(r => r.id === mult.roleId);
              return (
                <Card key={mult.roleId} className="surface-card hover:border-pink-500/30 transition-all group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
                          <Percent className="h-6 w-6 text-pink-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{mult.roleName || role?.name || 'Unknown Role'}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">
                              +{Math.round((mult.multiplier - 1) * 100)}% XP
                            </Badge>
                            <span className="text-xs text-gray-500">×{mult.multiplier}</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteMultiplier(mult.roleId)} 
                        className="h-8 w-8 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {roleMultipliers.length === 0 && (
              <Card className="surface-card border-dashed col-span-full">
                <CardContent className="py-12 text-center">
                  <Percent className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Multipliers</h3>
                  <p className="text-gray-400 mb-4">Add role multipliers to reward active supporters</p>
                  <Button onClick={openAddMultiplier} className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                    <Plus className="h-4 w-4 mr-2" /> Add Multiplier
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Level Roles Tab */}
        <TabsContent value="roles" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Level Roles</h2>
              <p className="text-gray-400 text-sm">Automatically assign roles when members reach certain levels</p>
            </div>
            <Button onClick={openAddLevelRole} className="bg-gradient-to-r from-amber-500 to-orange-500 text-black">
              <Plus className="h-4 w-4 mr-2" /> Add Level Role
            </Button>
          </div>

          <Alert className="bg-amber-500/10 border-amber-500/30">
            <Crown className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-gray-300">
              Roles will be automatically created when the first member reaches that level. The role will have the emoji, name, and color you configure.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {levelRoles.sort((a, b) => a.level - b.level).map(role => (
              <Card key={role.level} className="surface-card hover:border-amber-500/30 transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${role.roleColor}20` }}
                      >
                        {role.roleEmoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white">{role.roleName}</h3>
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: role.roleColor }}
                          />
                        </div>
                        <p className="text-sm text-gray-500">Level {role.level}</p>
                        {role.autoCreate && (
                          <Badge className="mt-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                            Auto-create
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => openEditLevelRole(role)} className="h-8 w-8 hover:bg-white/5">
                        <Edit2 className="h-4 w-4 text-blue-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteLevelRole(role.level)} className="h-8 w-8 hover:bg-white/5">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Daily Quests Tab */}
        <TabsContent value="quests" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Daily Quests</h2>
              <p className="text-gray-400 text-sm">Give members bonus XP for completing daily activities</p>
            </div>
            <Button onClick={openAddQuest} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Quest
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {dailyQuests.map(quest => (
              <Card key={quest.id} className={`surface-card transition-all ${quest.enabled ? 'hover:border-emerald-500/30' : 'opacity-60'}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-2xl">
                        {quest.emoji}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{quest.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{quest.description}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {quest.type.replace('_', ' ')}
                          </Badge>
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                            {quest.requirement}x
                          </Badge>
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            +{quest.xpReward} XP
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={quest.enabled}
                        onCheckedChange={() => toggleQuest(quest.id)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEditQuest(quest)} className="h-8 w-8 hover:bg-white/5">
                        <Edit2 className="h-4 w-4 text-blue-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteQuest(quest.id)} className="h-8 w-8 hover:bg-white/5">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Hash className="w-5 h-5 text-blue-400" />
                    <div>
                      <CardTitle className="text-white">Level Up Announcements</CardTitle>
                      <CardDescription className="text-gray-400">Where to announce level ups</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Announcement Channel</Label>
                    <ChannelSelector
                      value={settings.levelUpChannelId}
                      onChange={(value) => setSettings(s => ({ ...s, levelUpChannelId: value }))}
                      channels={channels}
                      placeholder="Select channel (or leave empty for same channel)"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-purple-400" />
                      <div>
                        <p className="text-white font-medium">DM Level Ups</p>
                        <p className="text-gray-400 text-sm">Send level up message via DM</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.levelUpDmEnabled}
                      onCheckedChange={(checked) => setSettings(s => ({ ...s, levelUpDmEnabled: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="surface-card overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                    <div>
                      <CardTitle className="text-white">Level Up Message</CardTitle>
                      <CardDescription className="text-gray-400">Customize the level up announcement</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-400" />
                      Quick Templates
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {LEVELUP_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSettings(s => ({ ...s, levelUpMessage: template.message }))}
                          className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all text-left"
                        >
                          <span className="block truncate">{template.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Message</Label>
                    <Textarea
                      value={settings.levelUpMessage}
                      onChange={(e) => setSettings(s => ({ ...s, levelUpMessage: e.target.value }))}
                      placeholder="🎉 {user} reached **Level {level}**!"
                      className="bg-[#1a1d26] border-white/10 text-white min-h-[100px] font-mono"
                    />
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Variables:</span>
                      <code className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">{'{user}'}</code>
                      <code className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">{'{level}'}</code>
                      <code className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">{'{xp}'}</code>
                      <code className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">{'{role}'}</code>
                    </div>
                  </div>

                  {settings.levelUpMessage && (
                    <div className="space-y-2">
                      <Label className="text-gray-300 flex items-center gap-2">
                        <Eye className="h-4 w-4 text-blue-400" />
                        Preview
                      </Label>
                      <div className="discord-preview p-4">
                        <p className="text-[#DBDEE1] text-sm whitespace-pre-wrap">
                          {settings.levelUpMessage
                            .replace('{user}', '@ActiveMember')
                            .replace('{level}', '10')
                            .replace('{xp}', '5,000')
                            .replace('{role}', '⭐ Regular')}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Multiplier Dialog */}
      <Dialog open={showMultiplierDialog} onOpenChange={setShowMultiplierDialog}>
        <DialogContent className="bg-[#1a1d26] text-white border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-pink-400" />
              Add XP Multiplier
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a role and set the XP multiplier for members with that role
            </DialogDescription>
          </DialogHeader>
          
          {editingMultiplier && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Role</Label>
                <Select
                  value={editingMultiplier.roleId}
                  onValueChange={v => setEditingMultiplier({ ...editingMultiplier, roleId: v })}
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
                <Label>Multiplier</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={editingMultiplier.multiplier}
                    onChange={e => setEditingMultiplier({ ...editingMultiplier, multiplier: parseFloat(e.target.value) || 1.5 })}
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                  <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30 whitespace-nowrap">
                    +{Math.round((editingMultiplier.multiplier - 1) * 100)}% XP
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">1.5 = +50% XP, 2.0 = +100% XP</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMultiplierDialog(false)} className="border-white/10">
              Cancel
            </Button>
            <Button onClick={saveMultiplier} className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
              <Save className="h-4 w-4 mr-2" /> Save Multiplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Level Role Dialog */}
      <Dialog open={showLevelRoleDialog} onOpenChange={setShowLevelRoleDialog}>
        <DialogContent className="bg-[#1a1d26] text-white border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              {editingLevelRole?.id ? 'Edit' : 'Add'} Level Role
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure the role that will be given at this level
            </DialogDescription>
          </DialogHeader>
          
          {editingLevelRole && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Input
                    type="number"
                    value={editingLevelRole.level}
                    onChange={e => setEditingLevelRole({ ...editingLevelRole, level: parseInt(e.target.value) || 1 })}
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role Name</Label>
                  <Input
                    value={editingLevelRole.roleName}
                    onChange={e => setEditingLevelRole({ ...editingLevelRole, roleName: e.target.value })}
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Emoji</Label>
                  <Input
                    value={editingLevelRole.roleEmoji}
                    onChange={e => setEditingLevelRole({ ...editingLevelRole, roleEmoji: e.target.value })}
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingLevelRole.roleColor}
                      onChange={e => setEditingLevelRole({ ...editingLevelRole, roleColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={editingLevelRole.roleColor}
                      onChange={e => setEditingLevelRole({ ...editingLevelRole, roleColor: e.target.value })}
                      className="bg-[#0f1218] border-white/10 text-white flex-1"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-white font-medium">Auto-create Role</p>
                    <p className="text-gray-400 text-sm">Create role when first member reaches this level</p>
                  </div>
                </div>
                <Switch
                  checked={editingLevelRole.autoCreate}
                  onCheckedChange={c => setEditingLevelRole({ ...editingLevelRole, autoCreate: c })}
                />
              </div>
              
              {/* Preview */}
              <div className="p-4 rounded-lg bg-[#0f1218] border border-white/10">
                <Label className="text-gray-400 text-xs mb-2 block">Preview</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{editingLevelRole.roleEmoji}</span>
                  <span 
                    className="font-medium px-2 py-1 rounded"
                    style={{ backgroundColor: `${editingLevelRole.roleColor}20`, color: editingLevelRole.roleColor }}
                  >
                    {editingLevelRole.roleName}
                  </span>
                  <span className="text-gray-500">- Level {editingLevelRole.level}</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLevelRoleDialog(false)} className="border-white/10">
              Cancel
            </Button>
            <Button onClick={saveLevelRole} className="bg-gradient-to-r from-amber-500 to-orange-500 text-black">
              <Save className="h-4 w-4 mr-2" /> Save Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quest Dialog */}
      <Dialog open={showQuestDialog} onOpenChange={setShowQuestDialog}>
        <DialogContent className="bg-[#1a1d26] text-white border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-400" />
              {editingQuest?.id ? 'Edit' : 'Add'} Daily Quest
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure a daily quest for your members
            </DialogDescription>
          </DialogHeader>
          
          {editingQuest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quest Name</Label>
                  <Input
                    value={editingQuest.name}
                    onChange={e => setEditingQuest({ ...editingQuest, name: e.target.value })}
                    placeholder="Daily Hello"
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emoji</Label>
                  <Input
                    value={editingQuest.emoji}
                    onChange={e => setEditingQuest({ ...editingQuest, emoji: e.target.value })}
                    placeholder="👋"
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editingQuest.description}
                  onChange={e => setEditingQuest({ ...editingQuest, description: e.target.value })}
                  placeholder="Say hello in any channel"
                  className="bg-[#0f1218] border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quest Type</Label>
                  <Select
                    value={editingQuest.type}
                    onValueChange={v => setEditingQuest({ ...editingQuest, type: v as DailyQuest['type'] })}
                  >
                    <SelectTrigger className="bg-[#0f1218] border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d26] border-white/10">
                      <SelectItem value="MESSAGE" className="text-white">Send Messages</SelectItem>
                      <SelectItem value="VOICE" className="text-white">Voice Minutes</SelectItem>
                      <SelectItem value="REACTION" className="text-white">Add Reactions</SelectItem>
                      <SelectItem value="FORUM_POST" className="text-white">Forum Posts</SelectItem>
                      <SelectItem value="IMAGE_POST" className="text-white">Image Posts</SelectItem>
                      <SelectItem value="CUSTOM" className="text-white">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Requirement</Label>
                  <Input
                    type="number"
                    value={editingQuest.requirement}
                    onChange={e => setEditingQuest({ ...editingQuest, requirement: parseInt(e.target.value) || 1 })}
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>XP Reward</Label>
                  <Input
                    type="number"
                    value={editingQuest.xpReward}
                    onChange={e => setEditingQuest({ ...editingQuest, xpReward: parseInt(e.target.value) || 50 })}
                    className="bg-[#0f1218] border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Channel (Optional)</Label>
                <ChannelSelector
                  value={editingQuest.channelId || ''}
                  onChange={(v) => setEditingQuest({ ...editingQuest, channelId: v })}
                  channels={channels}
                  placeholder="Any channel"
                />
                <p className="text-xs text-gray-500">Leave empty to allow in any channel</p>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-white font-medium">Enable Quest</p>
                    <p className="text-gray-400 text-sm">Quest is active and can be completed</p>
                  </div>
                </div>
                <Switch
                  checked={editingQuest.enabled}
                  onCheckedChange={c => setEditingQuest({ ...editingQuest, enabled: c })}
                />
              </div>

              {/* Preview */}
              <div className="p-4 rounded-lg bg-[#0f1218] border border-white/10">
                <Label className="text-gray-400 text-xs mb-2 block">Preview</Label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xl">
                    {editingQuest.emoji}
                  </div>
                  <div>
                    <p className="text-white font-medium">{editingQuest.name}</p>
                    <p className="text-xs text-gray-400">{editingQuest.description}</p>
                  </div>
                  <Badge className="ml-auto bg-yellow-500/20 text-yellow-400">+{editingQuest.xpReward} XP</Badge>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestDialog(false)} className="border-white/10">
              Cancel
            </Button>
            <Button onClick={saveQuest} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <Save className="h-4 w-4 mr-2" /> Save Quest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
