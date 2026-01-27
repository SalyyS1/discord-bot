'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import {
  Loader2,
  MessageSquare,
  AlertCircle,
  Save,
  RotateCcw,
  Eye,
  Code,
  Image as ImageIcon,
  Server,
  Sparkles,
  Check,
  ChevronRight,
  ChevronDown,
  Hash,
  Plus,
  Trash2,
  Palette,
  Type,
  Clock,
  User,
  Layers,
  GripVertical,
  Zap,
  X,
  Send,
  Star,
  Gift,
  UserPlus,
  UserMinus,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChannelSelector, Channel } from '@/components/selectors/channel-selector';
import { useSelectedGuild } from '@/hooks/use-selected-guild';
import { useGuildContext } from '@/context/guild-context';

// Types
interface EmbedField {
  id: string;
  name: string;
  value: string;
  inline: boolean;
}

interface EmbedConfig {
  enabled: boolean;
  title?: string;
  description?: string;
  color?: string;
  thumbnail?: string;
  image?: string;
  footer?: string;
  footerIcon?: string;
  author?: string;
  authorIcon?: string;
  authorUrl?: string;
  timestamp: boolean;
  fields: EmbedField[];
}

interface MessageConfig {
  content: string;
  embed: EmbedConfig;
  imageUrl?: string;
  enabled: boolean;
  channelId?: string;
}

interface MessageTemplate {
  id: string | null;
  guildId: string;
  name: string;
  config: MessageConfig;
  isDefault?: boolean;
}

// Template Categories (removed tickets and engagement - they have their own pages)
const TEMPLATE_CATEGORIES = [
  {
    id: 'community',
    label: 'Community',
    icon: '👥',
    color: 'emerald',
  },
  {
    id: 'moderation',
    label: 'Moderation',
    icon: '🛡️',
    color: 'red',
  },
  {
    id: 'giveaways',
    label: 'Giveaways',
    icon: '🎁',
    color: 'pink',
  },
];

// Template definitions (removed duplicates that exist in other pages)
const TEMPLATE_INFO: Record<string, {
  label: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  placeholders: Array<{ key: string; description: string; example: string }>;
  hasChannel?: boolean;
  channelLabel?: string;
  defaultConfig: MessageConfig;
}> = {
  welcome: {
    label: 'Welcome Message',
    description: 'Sent when a new member joins',
    category: 'community',
    icon: <UserPlus className="h-5 w-5" />,
    color: 'emerald',
    hasChannel: true,
    channelLabel: 'Welcome Channel',
    placeholders: [
      { key: '{user}', description: 'Mention the user', example: '@JohnDoe' },
      { key: '{username}', description: 'Username without mention', example: 'JohnDoe' },
      { key: '{server}', description: 'Server name', example: 'My Server' },
      { key: '{membercount}', description: 'Total members', example: '1,234' },
      { key: '{inviter}', description: 'Who invited them', example: '@Inviter' },
      { key: '{position}', description: 'Join position', example: '1,234th' },
      { key: '{created}', description: 'Account age', example: '2 years ago' },
    ],
    defaultConfig: {
      content: '',
      enabled: true,
      embed: {
        enabled: true,
        title: '👋 Welcome to {server}!',
        description: 'Hey {user}, welcome to our community!\n\nYou are our **{membercount}th** member!\n\n📜 Read our rules in <#rules>\n💬 Introduce yourself in <#introductions>',
        color: '#57F287',
        timestamp: true,
        fields: [],
      },
    },
  },
  goodbye: {
    label: 'Goodbye Message',
    description: 'Sent when a member leaves',
    category: 'community',
    icon: <UserMinus className="h-5 w-5" />,
    color: 'rose',
    hasChannel: true,
    channelLabel: 'Goodbye Channel',
    placeholders: [
      { key: '{user}', description: 'Mention the user', example: '@JohnDoe' },
      { key: '{username}', description: 'Username', example: 'JohnDoe' },
      { key: '{server}', description: 'Server name', example: 'My Server' },
      { key: '{membercount}', description: 'Remaining members', example: '1,233' },
      { key: '{joined}', description: 'When they joined', example: '6 months ago' },
    ],
    defaultConfig: {
      content: '',
      enabled: true,
      embed: {
        enabled: true,
        title: '👋 Goodbye!',
        description: '**{username}** has left the server.\n\nWe now have **{membercount}** members.',
        color: '#ED4245',
        timestamp: true,
        fields: [],
      },
    },
  },
  boost: {
    label: 'Server Boost',
    description: 'Sent when someone boosts the server',
    category: 'community',
    icon: <Zap className="h-5 w-5" />,
    color: 'pink',
    hasChannel: true,
    channelLabel: 'Boost Announcement Channel',
    placeholders: [
      { key: '{user}', description: 'Mention the booster', example: '@JohnDoe' },
      { key: '{username}', description: 'Username', example: 'JohnDoe' },
      { key: '{server}', description: 'Server name', example: 'My Server' },
      { key: '{boosts}', description: 'Total boosts', example: '15' },
      { key: '{level}', description: 'Boost level', example: '2' },
    ],
    defaultConfig: {
      content: '',
      enabled: true,
      embed: {
        enabled: true,
        title: '💎 New Server Boost!',
        description: '**{user}** just boosted the server!\n\n🚀 We now have **{boosts} boosts** (Level {level})\n\nThank you for your support! 💖',
        color: '#F47FFF',
        timestamp: true,
        fields: [],
      },
    },
  },
  autorole: {
    label: 'Auto Role DM',
    description: 'DM when auto role is assigned',
    category: 'community',
    icon: <User className="h-5 w-5" />,
    color: 'blue',
    placeholders: [
      { key: '{user}', description: 'User mention', example: '@JohnDoe' },
      { key: '{role}', description: 'Assigned role', example: '@Member' },
      { key: '{server}', description: 'Server name', example: 'My Server' },
    ],
    defaultConfig: {
      content: '',
      enabled: false,
      embed: {
        enabled: true,
        title: '🎭 Role Assigned',
        description: 'You have been automatically assigned the {role} role in **{server}**!',
        color: '#5865F2',
        timestamp: true,
        fields: [],
      },
    },
  },
  giveaway_start: {
    label: 'Giveaway Start',
    description: 'The giveaway announcement',
    category: 'giveaways',
    icon: <Gift className="h-5 w-5" />,
    color: 'pink',
    placeholders: [
      { key: '{prize}', description: 'Prize name', example: 'Discord Nitro' },
      { key: '{winners}', description: 'Number of winners', example: '1' },
      { key: '{ends}', description: 'End time', example: 'in 7 days' },
      { key: '{host}', description: 'Host mention', example: '@Host' },
      { key: '{entries}', description: 'Total entries', example: '50' },
      { key: '{requirement}', description: 'Entry requirement', example: '@Member role' },
    ],
    defaultConfig: {
      content: '🎉 **GIVEAWAY** 🎉',
      enabled: true,
      embed: {
        enabled: true,
        title: '{prize}',
        description: 'React with 🎉 to enter!\n\n⏰ Ends: {ends}\n👑 Winners: **{winners}**\n🎯 Hosted by: {host}',
        color: '#EB459E',
        timestamp: true,
        fields: [],
      },
    },
  },
  giveaway_end: {
    label: 'Giveaway End',
    description: 'Winner announcement',
    category: 'giveaways',
    icon: <Star className="h-5 w-5" />,
    color: 'yellow',
    placeholders: [
      { key: '{prize}', description: 'Prize name', example: 'Discord Nitro' },
      { key: '{winners}', description: 'Winner mentions', example: '@Winner1, @Winner2' },
      { key: '{entries}', description: 'Total entries', example: '150' },
      { key: '{host}', description: 'Host mention', example: '@Host' },
    ],
    defaultConfig: {
      content: '',
      enabled: true,
      embed: {
        enabled: true,
        title: '🎊 Giveaway Ended!',
        description: '**{prize}**\n\n🏆 Winner(s): {winners}\n\n📊 Total Entries: **{entries}**\nCongratulations! 🎉',
        color: '#57F287',
        timestamp: true,
        fields: [],
      },
    },
  },
  modlog_warn: {
    label: 'Warning Log',
    description: 'Logged when user is warned',
    category: 'moderation',
    icon: <AlertCircle className="h-5 w-5" />,
    color: 'yellow',
    placeholders: [
      { key: '{user}', description: 'Warned user', example: '@JohnDoe' },
      { key: '{moderator}', description: 'Moderator', example: '@Mod' },
      { key: '{reason}', description: 'Warning reason', example: 'Spam' },
      { key: '{case}', description: 'Case number', example: '#42' },
      { key: '{warnings}', description: 'Total warnings', example: '3' },
    ],
    defaultConfig: {
      content: '',
      enabled: true,
      embed: {
        enabled: true,
        title: '⚠️ Member Warned',
        description: '**User:** {user}\n**Moderator:** {moderator}\n**Reason:** {reason}',
        color: '#FEE75C',
        timestamp: true,
        footer: 'Case {case} • Total Warnings: {warnings}',
        fields: [],
      },
    },
  },
  modlog_mute: {
    label: 'Mute Log',
    description: 'Logged when user is muted',
    category: 'moderation',
    icon: <X className="h-5 w-5" />,
    color: 'orange',
    placeholders: [
      { key: '{user}', description: 'Muted user', example: '@JohnDoe' },
      { key: '{moderator}', description: 'Moderator', example: '@Mod' },
      { key: '{reason}', description: 'Mute reason', example: 'Spam' },
      { key: '{duration}', description: 'Mute duration', example: '1 hour' },
      { key: '{case}', description: 'Case number', example: '#42' },
    ],
    defaultConfig: {
      content: '',
      enabled: true,
      embed: {
        enabled: true,
        title: '🔇 Member Muted',
        description: '**User:** {user}\n**Moderator:** {moderator}\n**Duration:** {duration}\n**Reason:** {reason}',
        color: '#E67E22',
        timestamp: true,
        footer: 'Case {case}',
        fields: [],
      },
    },
  },
  modlog_kick: {
    label: 'Kick Log',
    description: 'Logged when user is kicked',
    category: 'moderation',
    icon: <UserMinus className="h-5 w-5" />,
    color: 'orange',
    placeholders: [
      { key: '{user}', description: 'Kicked user', example: '@JohnDoe' },
      { key: '{moderator}', description: 'Moderator', example: '@Mod' },
      { key: '{reason}', description: 'Kick reason', example: 'Violation of rules' },
      { key: '{case}', description: 'Case number', example: '#42' },
    ],
    defaultConfig: {
      content: '',
      enabled: true,
      embed: {
        enabled: true,
        title: '👢 Member Kicked',
        description: '**User:** {user}\n**Moderator:** {moderator}\n**Reason:** {reason}',
        color: '#E67E22',
        timestamp: true,
        footer: 'Case {case}',
        fields: [],
      },
    },
  },
  modlog_ban: {
    label: 'Ban Log',
    description: 'Logged when user is banned',
    category: 'moderation',
    icon: <Shield className="h-5 w-5" />,
    color: 'red',
    placeholders: [
      { key: '{user}', description: 'Banned user', example: '@JohnDoe' },
      { key: '{moderator}', description: 'Moderator', example: '@Mod' },
      { key: '{reason}', description: 'Ban reason', example: 'Repeated violations' },
      { key: '{duration}', description: 'Ban duration', example: 'Permanent' },
      { key: '{case}', description: 'Case number', example: '#42' },
    ],
    defaultConfig: {
      content: '',
      enabled: true,
      embed: {
        enabled: true,
        title: '🔨 Member Banned',
        description: '**User:** {user}\n**Moderator:** {moderator}\n**Duration:** {duration}\n**Reason:** {reason}',
        color: '#ED4245',
        timestamp: true,
        footer: 'Case {case}',
        fields: [],
      },
    },
  },
};

// Color presets
const COLOR_PRESETS = [
  { name: 'Discord Blue', value: '#5865F2' },
  { name: 'Green', value: '#57F287' },
  { name: 'Yellow', value: '#FEE75C' },
  { name: 'Red', value: '#ED4245' },
  { name: 'Pink', value: '#EB459E' },
  { name: 'Purple', value: '#9B59B6' },
  { name: 'Cyan', value: '#00D4AA' },
  { name: 'Orange', value: '#E67E22' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Gray', value: '#99AAB5' },
];

// Default message config
const getDefaultConfig = (templateName: string): MessageConfig => {
  return TEMPLATE_INFO[templateName]?.defaultConfig || {
    content: '',
    enabled: true,
    embed: {
      enabled: true,
      title: '',
      description: '',
      color: '#5865F2',
      timestamp: true,
      fields: [],
    },
  };
};

export default function MessagesPage() {
  const { guildId, guilds, loading: guildLoading, error: guildError } = useSelectedGuild();
  const { setSelectedGuildId } = useGuildContext();
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Record<string, MessageConfig>>({});
  const [channels, setChannels] = useState<Channel[]>([]);

  // Editor state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('welcome');
  const [selectedCategory, setSelectedCategory] = useState<string>('community');
  const [config, setConfig] = useState<MessageConfig>(getDefaultConfig('welcome'));
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic', 'embed']);

  // Quick test dialog
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testChannelId, setTestChannelId] = useState('');

  const loading = guildLoading || dataLoading;
  const error = guildError;
  const templateInfo = TEMPLATE_INFO[selectedTemplate];

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!guildId) return;

    setDataLoading(true);
    try {
      const [templatesRes, channelsRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/messages`),
        fetch(`/api/guilds/${guildId}/channels`)
      ]);

      if (templatesRes.ok) {
        const { data } = await templatesRes.json();
        // Convert array to record
        const templatesMap: Record<string, MessageConfig> = {};
        (data || []).forEach((t: MessageTemplate) => {
          templatesMap[t.name] = t.config || getDefaultConfig(t.name);
        });
        setTemplates(templatesMap);

        // Load first template
        if (templatesMap.welcome) {
          setConfig(templatesMap.welcome);
        }
      }

      if (channelsRes.ok) {
        const { data } = await channelsRes.json();
        setChannels(data || []);
      }
    } catch {
      // Silent fail
    } finally {
      setDataLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle template selection
  const handleTemplateSelect = (name: string) => {
    setSelectedTemplate(name);
    setConfig(templates[name] || getDefaultConfig(name));
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Select first template in category
    const firstInCategory = Object.entries(TEMPLATE_INFO).find(([, info]) => info.category === categoryId);
    if (firstInCategory) {
      handleTemplateSelect(firstInCategory[0]);
    }
  };

  // Update config
  const updateConfig = (updates: Partial<MessageConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // Update embed
  const updateEmbed = (updates: Partial<EmbedConfig>) => {
    setConfig(prev => ({
      ...prev,
      embed: { ...prev.embed, ...updates },
    }));
  };

  // Add embed field
  const addEmbedField = () => {
    const newField: EmbedField = {
      id: `field-${Date.now()}`,
      name: 'Field Name',
      value: 'Field Value',
      inline: false,
    };
    updateEmbed({ fields: [...(config.embed.fields || []), newField] });
  };

  // Remove embed field
  const removeEmbedField = (id: string) => {
    updateEmbed({ fields: config.embed.fields?.filter(f => f.id !== id) || [] });
  };

  // Update embed field
  const updateEmbedField = (id: string, updates: Partial<EmbedField>) => {
    updateEmbed({
      fields: config.embed.fields?.map(f => f.id === id ? { ...f, ...updates } : f) || [],
    });
  };

  // Insert placeholder
  const insertPlaceholder = (key: string, target: 'content' | 'title' | 'description') => {
    if (target === 'content') {
      updateConfig({ content: (config.content || '') + key });
    } else if (target === 'title') {
      updateEmbed({ title: (config.embed.title || '') + key });
    } else {
      updateEmbed({ description: (config.embed.description || '') + key });
    }
    toast.success(`Inserted ${key}`);
  };

  // Save template
  const handleSave = async () => {
    if (!guildId) return;

    setSaving(selectedTemplate);
    try {
      const res = await fetch(`/api/guilds/${guildId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedTemplate,
          config,
        }),
      });

      if (res.ok) {
        setTemplates(prev => ({ ...prev, [selectedTemplate]: config }));
        toast.success('Template saved successfully!');
      } else {
        toast.error('Failed to save template');
      }
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSaving(null);
    }
  };

  // Reset template
  const handleReset = async () => {
    if (!guildId) return;

    setSaving(selectedTemplate);
    try {
      const res = await fetch(`/api/guilds/${guildId}/messages?name=${selectedTemplate}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const defaultConfig = getDefaultConfig(selectedTemplate);
        setConfig(defaultConfig);
        setTemplates(prev => {
          const newTemplates = { ...prev };
          delete newTemplates[selectedTemplate];
          return newTemplates;
        });
        toast.success('Template reset to default');
      } else {
        toast.error('Failed to reset template');
      }
    } catch {
      toast.error('Failed to reset template');
    } finally {
      setSaving(null);
    }
  };

  // Test send
  const handleTestSend = async () => {
    if (!guildId || !testChannelId) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/messages/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: testChannelId,
          config,
        }),
      });

      if (res.ok) {
        toast.success('Test message sent!');
        setTestDialogOpen(false);
      } else {
        toast.error('Failed to send test message');
      }
    } catch {
      toast.error('Failed to send test message');
    }
  };

  // Preview renderer - sanitized to prevent XSS
  const renderPreview = useCallback((text: string) => {
    // First sanitize the input to remove any malicious scripts
    const sanitized = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [], // Strip all HTML tags from user input
      ALLOWED_ATTR: [],
    });

    // Then apply our safe formatting
    return sanitized
      .replace(/\{user\}/g, '<span class="text-blue-400">@JohnDoe</span>')
      .replace(/\{username\}/g, 'JohnDoe')
      .replace(/\{server\}/g, 'My Awesome Server')
      .replace(/\{membercount\}/g, '1,234')
      .replace(/\{inviter\}/g, '<span class="text-blue-400">@Inviter</span>')
      .replace(/\{position\}/g, '1,234th')
      .replace(/\{prize\}/g, 'Discord Nitro')
      .replace(/\{winners\}/g, '<span class="text-blue-400">@Winner1</span>')
      .replace(/\{ends\}/g, '<t:1706000000:R>')
      .replace(/\{host\}/g, '<span class="text-blue-400">@Host</span>')
      .replace(/\{entries\}/g, '150')
      .replace(/\{reason\}/g, 'Issue resolved')
      .replace(/\{moderator\}/g, '<span class="text-blue-400">@Moderator</span>')
      .replace(/\{case\}/g, '#42')
      .replace(/\{warnings\}/g, '3')
      .replace(/\{duration\}/g, 'Permanent')
      .replace(/\{role\}/g, '<span class="text-blue-400">@Member</span>')
      .replace(/\{boosts\}/g, '15')
      .replace(/\{level\}/g, '2')
      .replace(/\{created\}/g, '2 years ago')
      .replace(/\{joined\}/g, '6 months ago')
      .replace(/\{requirement\}/g, '<span class="text-blue-400">@Member</span>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/~~(.*?)~~/g, '<s>$1</s>')
      .replace(/\n/g, '<br/>');
  }, []);

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading message templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const templatesInCategory = Object.entries(TEMPLATE_INFO).filter(([, info]) => info.category === selectedCategory);
  const isCustomized = templates[selectedTemplate] !== undefined;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-cyan-600/20 border border-white/10 p-8">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative flex items-center justify-between flex-wrap gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-lg opacity-50" />
              <div className="relative p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Message Templates</h1>
              <p className="text-gray-400 mt-1">Customize bot messages with rich embeds and placeholders</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/30 backdrop-blur border border-white/10">
              <Server className="h-5 w-5 text-gray-400" />
              <Select value={guildId || ''} onValueChange={setSelectedGuildId}>
                <SelectTrigger className="w-[180px] bg-transparent border-0 text-white focus:ring-0 h-auto p-0">
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

        {/* Category Tabs */}
        <div className="relative flex flex-wrap gap-2 mt-8">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${selectedCategory === cat.id
                ? 'bg-white/15 text-white border border-white/20'
                : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10 hover:text-white'
                }`}
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="font-medium">{cat.label}</span>
              <Badge className="ml-1 bg-white/10 text-white/70 border-0 text-xs">
                {Object.values(TEMPLATE_INFO).filter(t => t.category === cat.id).length}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Template List */}
        <div className="lg:col-span-3 space-y-2">
          <Label className="text-gray-400 text-xs uppercase tracking-wider px-2">Templates</Label>
          <div className="space-y-1">
            {templatesInCategory.map(([name, info]) => {
              const isSelected = selectedTemplate === name;
              const hasCustom = templates[name] !== undefined;
              return (
                <button
                  key={name}
                  onClick={() => handleTemplateSelect(name)}
                  className={`w-full text-left p-3 rounded-xl transition-all group ${isSelected
                    ? 'bg-purple-500/20 text-white border border-purple-500/30'
                    : 'bg-white/5 text-gray-300 border border-transparent hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-500/30' : 'bg-white/10 group-hover:bg-white/15'}`}>
                      {info.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{info.label}</span>
                        {hasCustom && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px]">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 truncate block">{info.description}</span>
                    </div>
                    {isSelected && <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-[hsl(220_20%_14%)] border-white/10 overflow-hidden">
            <CardHeader className="border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20">
                    {templateInfo?.icon}
                  </div>
                  <div>
                    <CardTitle className="text-white">{templateInfo?.label}</CardTitle>
                    <CardDescription className="text-gray-400">{templateInfo?.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => updateConfig({ enabled: checked })}
                  />
                  <span className={`text-sm ${config.enabled ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {config.enabled ? 'On' : 'Off'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Channel Selector */}
              {templateInfo?.hasChannel && (
                <div className="p-4 border-b border-white/10 bg-white/5">
                  <Label className="text-gray-300 text-sm flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4 text-blue-400" />
                    {templateInfo.channelLabel}
                  </Label>
                  <ChannelSelector
                    value={config.channelId || ''}
                    onChange={(v) => updateConfig({ channelId: v })}
                    channels={channels}
                    types={['text', 'announcement']}
                    placeholder="Select channel..."
                  />
                </div>
              )}

              {/* Placeholders Section */}
              <div className="border-b border-white/10">
                <button
                  onClick={() => toggleSection('placeholders')}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-cyan-400" />
                    <span className="text-white font-medium">Placeholders</span>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-0 text-xs">
                      {templateInfo?.placeholders.length || 0}
                    </Badge>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedSections.includes('placeholders') ? 'rotate-180' : ''}`} />
                </button>
                {expandedSections.includes('placeholders') && (
                  <div className="p-4 pt-0 bg-white/5">
                    <div className="grid grid-cols-2 gap-2">
                      {templateInfo?.placeholders.map((p) => (
                        <Popover key={p.key}>
                          <PopoverTrigger asChild>
                            <button className="text-left p-2 rounded-lg bg-[hsl(220_20%_18%)] hover:bg-[hsl(220_20%_22%)] border border-white/10 transition-colors group">
                              <code className="text-cyan-400 text-xs font-mono">{p.key}</code>
                              <p className="text-gray-500 text-xs mt-0.5 truncate">{p.description}</p>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 bg-[hsl(220_20%_14%)] border-white/10 p-3">
                            <div className="space-y-2">
                              <div>
                                <code className="text-cyan-400 text-sm">{p.key}</code>
                                <p className="text-gray-400 text-xs mt-1">{p.description}</p>
                                <p className="text-gray-500 text-xs mt-1">Example: <span className="text-white">{p.example}</span></p>
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => insertPlaceholder(p.key, 'content')}>
                                  Content
                                </Button>
                                <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => insertPlaceholder(p.key, 'title')}>
                                  Title
                                </Button>
                                <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => insertPlaceholder(p.key, 'description')}>
                                  Desc
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Text Content Section */}
              <div className="border-b border-white/10">
                <button
                  onClick={() => toggleSection('basic')}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-blue-400" />
                    <span className="text-white font-medium">Text Content</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedSections.includes('basic') ? 'rotate-180' : ''}`} />
                </button>
                {expandedSections.includes('basic') && (
                  <div className="p-4 pt-0 space-y-3">
                    <Textarea
                      value={config.content || ''}
                      onChange={(e) => updateConfig({ content: e.target.value })}
                      placeholder="Plain text message (shown above embed)..."
                      rows={2}
                      className="bg-[hsl(220_20%_10%)] border-white/10 text-white placeholder:text-gray-500 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500">This text appears above the embed. Leave empty to only show embed.</p>
                  </div>
                )}
              </div>

              {/* Embed Builder Section */}
              <div className="border-b border-white/10">
                <div className="p-4 flex items-center justify-between">
                  <button
                    onClick={() => toggleSection('embed')}
                    className="flex items-center gap-2 flex-1"
                  >
                    <Layers className="h-4 w-4 text-purple-400" />
                    <span className="text-white font-medium">Embed</span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedSections.includes('embed') ? 'rotate-180' : ''}`} />
                  </button>
                  <Switch
                    checked={config.embed.enabled}
                    onCheckedChange={(checked) => updateEmbed({ enabled: checked })}
                  />
                </div>
                {expandedSections.includes('embed') && config.embed.enabled && (
                  <div className="p-4 pt-0 space-y-4">
                    {/* Title */}
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs">Title</Label>
                      <Input
                        value={config.embed.title || ''}
                        onChange={(e) => updateEmbed({ title: e.target.value })}
                        placeholder="Embed title..."
                        className="bg-[hsl(220_20%_10%)] border-white/10 text-white"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs">Description</Label>
                      <Textarea
                        value={config.embed.description || ''}
                        onChange={(e) => updateEmbed({ description: e.target.value })}
                        placeholder="Embed description with **markdown** support..."
                        rows={4}
                        className="bg-[hsl(220_20%_10%)] border-white/10 text-white placeholder:text-gray-500 font-mono text-sm"
                      />
                    </div>

                    {/* Color */}
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs flex items-center gap-2">
                        <Palette className="h-3 w-3" /> Color
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.embed.color || '#5865F2'}
                          onChange={(e) => updateEmbed({ color: e.target.value })}
                          className="h-8 w-12 rounded border-0 cursor-pointer"
                        />
                        <div className="flex flex-wrap gap-1">
                          {COLOR_PRESETS.map((preset) => (
                            <button
                              key={preset.value}
                              onClick={() => updateEmbed({ color: preset.value })}
                              className={`w-6 h-6 rounded transition-all ${config.embed.color === preset.value ? 'ring-2 ring-white ring-offset-1 ring-offset-[hsl(220_20%_14%)]' : 'hover:scale-110'}`}
                              style={{ backgroundColor: preset.value }}
                              title={preset.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Images */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-gray-400 text-xs flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" /> Thumbnail
                        </Label>
                        <Input
                          value={config.embed.thumbnail || ''}
                          onChange={(e) => updateEmbed({ thumbnail: e.target.value })}
                          placeholder="https://..."
                          className="bg-[hsl(220_20%_10%)] border-white/10 text-white text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-gray-400 text-xs flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" /> Image
                        </Label>
                        <Input
                          value={config.embed.image || ''}
                          onChange={(e) => updateEmbed({ image: e.target.value })}
                          placeholder="https://..."
                          className="bg-[hsl(220_20%_10%)] border-white/10 text-white text-xs"
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs">Footer</Label>
                      <div className="flex gap-2">
                        <Input
                          value={config.embed.footer || ''}
                          onChange={(e) => updateEmbed({ footer: e.target.value })}
                          placeholder="Footer text..."
                          className="bg-[hsl(220_20%_10%)] border-white/10 text-white flex-1"
                        />
                        <Input
                          value={config.embed.footerIcon || ''}
                          onChange={(e) => updateEmbed({ footerIcon: e.target.value })}
                          placeholder="Icon URL"
                          className="bg-[hsl(220_20%_10%)] border-white/10 text-white w-28"
                        />
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-400" />
                        <span className="text-gray-300 text-sm">Show Timestamp</span>
                      </div>
                      <Switch
                        checked={config.embed.timestamp}
                        onCheckedChange={(checked) => updateEmbed({ timestamp: checked })}
                      />
                    </div>

                    {/* Fields */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-400 text-xs">Embed Fields</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={addEmbedField}
                          disabled={(config.embed.fields?.length || 0) >= 25}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Field
                        </Button>
                      </div>
                      {config.embed.fields?.map((field) => (
                        <div key={field.id} className="p-3 rounded-lg bg-[hsl(220_20%_10%)] border border-white/10 space-y-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-gray-500" />
                            <Input
                              value={field.name}
                              onChange={(e) => updateEmbedField(field.id, { name: e.target.value })}
                              placeholder="Field name"
                              className="bg-transparent border-white/10 text-white flex-1 h-8 text-sm"
                            />
                            <button
                              onClick={() => updateEmbedField(field.id, { inline: !field.inline })}
                              className={`px-2 py-1 rounded text-xs ${field.inline ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400'}`}
                            >
                              Inline
                            </button>
                            <button
                              onClick={() => removeEmbedField(field.id)}
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <Textarea
                            value={field.value}
                            onChange={(e) => updateEmbedField(field.id, { value: e.target.value })}
                            placeholder="Field value..."
                            rows={2}
                            className="bg-transparent border-white/10 text-white text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2">
                  {isCustomized && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      disabled={saving === selectedTemplate}
                      className="border-white/10 text-gray-300 hover:bg-white/5"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTestDialogOpen(true)}
                    className="border-white/10 text-gray-300 hover:bg-white/5"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving === selectedTemplate}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  {saving === selectedTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-[hsl(220_20%_14%)] border-white/10 sticky top-4">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Eye className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Live Preview</CardTitle>
                    <CardDescription className="text-gray-400">Discord message preview</CardDescription>
                  </div>
                </div>
                <Badge className={`${config.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'} border-0`}>
                  {config.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Discord Preview */}
              <div className="bg-[#313338] rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">SylaBot</span>
                      <span className="px-1.5 py-0.5 bg-[#5865f2] text-white text-[10px] font-medium rounded">BOT</span>
                      <span className="text-gray-500 text-xs">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Content */}
                    {config.content && (
                      <div
                        className="mt-1 text-[#dbdee1] text-sm"
                        dangerouslySetInnerHTML={{ __html: renderPreview(config.content) }}
                      />
                    )}

                    {/* Embed */}
                    {config.embed.enabled && (
                      <div className="mt-2 rounded overflow-hidden bg-[#2b2d31] max-w-md">
                        <div className="flex">
                          <div
                            className="w-1 flex-shrink-0"
                            style={{ backgroundColor: config.embed.color || '#5865F2' }}
                          />
                          <div className="flex-1 p-3">
                            {config.embed.title && (
                              <h4
                                className="font-semibold text-white text-sm"
                                dangerouslySetInnerHTML={{ __html: renderPreview(config.embed.title) }}
                              />
                            )}
                            {config.embed.description && (
                              <div
                                className="text-[#dbdee1] text-sm mt-1"
                                dangerouslySetInnerHTML={{ __html: renderPreview(config.embed.description) }}
                              />
                            )}

                            {/* Fields */}
                            {config.embed.fields && config.embed.fields.length > 0 && (
                              <div className={`mt-2 grid gap-2 ${config.embed.fields.some(f => f.inline) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {config.embed.fields.map((field) => (
                                  <div key={field.id} className={field.inline ? '' : 'col-span-full'}>
                                    <p className="text-white text-xs font-semibold">{field.name}</p>
                                    <p
                                      className="text-[#dbdee1] text-xs"
                                      dangerouslySetInnerHTML={{ __html: renderPreview(field.value) }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Image */}
                            {config.embed.image && (
                              <div className="mt-2 rounded overflow-hidden">
                                <div className="bg-[#1e1f22] h-32 flex items-center justify-center text-gray-500">
                                  <ImageIcon className="h-8 w-8" />
                                </div>
                              </div>
                            )}

                            {/* Footer */}
                            {(config.embed.footer || config.embed.timestamp) && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-[#949ba4]">
                                {config.embed.footer && (
                                  <span dangerouslySetInnerHTML={{ __html: renderPreview(config.embed.footer) }} />
                                )}
                                {config.embed.footer && config.embed.timestamp && <span>•</span>}
                                {config.embed.timestamp && (
                                  <span>Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Thumbnail */}
                          {config.embed.thumbnail && (
                            <div className="p-3">
                              <div className="w-20 h-20 rounded bg-[#1e1f22] flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-gray-500" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400 mt-0.5" />
                  <div className="text-xs text-gray-400">
                    <p className="text-purple-400 font-medium mb-1">Formatting Tips</p>
                    <ul className="space-y-1">
                      <li>• <code className="bg-white/10 px-1 rounded">**bold**</code> for <strong>bold</strong></li>
                      <li>• <code className="bg-white/10 px-1 rounded">*italic*</code> for <em>italic</em></li>
                      <li>• <code className="bg-white/10 px-1 rounded">__underline__</code> for <u>underline</u></li>
                      <li>• <code className="bg-white/10 px-1 rounded">~~strike~~</code> for <s>strikethrough</s></li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Test Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="bg-[hsl(220_20%_14%)] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Send Test Message</DialogTitle>
            <DialogDescription className="text-gray-400">
              Send a test message to preview how it looks in Discord
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Target Channel</Label>
              <ChannelSelector
                value={testChannelId}
                onChange={setTestChannelId}
                channels={channels.filter(c => c.type === 'text' || c.type === 'announcement')}
                types={['text', 'announcement']}
                placeholder="Select channel..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)} className="border-white/10 text-gray-300">
              Cancel
            </Button>
            <Button
              onClick={handleTestSend}
              disabled={!testChannelId}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
