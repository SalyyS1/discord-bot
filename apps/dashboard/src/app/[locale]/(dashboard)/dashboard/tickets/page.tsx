'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Ticket, 
  Settings, 
  Save, 
  Loader2, 
  Server,
  FolderOpen,
  Hash,
  Users,
  Clock,
  Shield,
  Sparkles,
  AlertCircle,
  Send,
  ChevronRight,
  Palette,
  List,
  X,
  ExternalLink,
  User,
  Plus,
  Trash2,
  GripVertical,
  MessageSquare,
  Bell,
  Eye,
  Copy,
  LayoutGrid,
  FileText,
  Tag,
  AtSign,
  Pencil,
  ChevronDown,
  Check,
  Layers,
  Type,
  AlignLeft,
  ListOrdered,
  ChevronUp,
  ToggleLeft,
  Image,
  Link2,
  Star,
  RefreshCw,
  Zap,
  Wand2,
  Code,
  HelpCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { ChannelSelector, Channel } from '@/components/selectors/channel-selector';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSelectedGuild } from '@/hooks/use-selected-guild';
import { useGuildContext } from '@/context/guild-context';

// Types
interface TicketCategory {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  pingRoleIds: string[];
  pingUserIds: string[];
  categoryChannelId?: string;
  namingPattern?: string;
  formEnabled: boolean;
  formQuestions: FormQuestion[];
  claimEnabled: boolean;
  autoClaimRole?: string;
  sortOrder: number;
  enabled: boolean;
}

interface FormQuestion {
  id: string;
  label: string;
  type: 'short' | 'paragraph' | 'select' | 'number';
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select type
  minLength?: number;
  maxLength?: number;
}

// Form question type options
const FORM_QUESTION_TYPES = [
  { value: 'short', label: 'Short Text', icon: '📝', description: 'Single line text input' },
  { value: 'paragraph', label: 'Paragraph', icon: '📄', description: 'Multi-line text area' },
  { value: 'select', label: 'Dropdown', icon: '📋', description: 'Select from options' },
  { value: 'number', label: 'Number', icon: '🔢', description: 'Numeric input' },
];

// Default form question
const DEFAULT_FORM_QUESTION: Omit<FormQuestion, 'id'> = {
  label: '',
  type: 'short',
  required: false,
  placeholder: '',
  options: [],
};

interface TicketPanel {
  id: string;
  name: string;
  title: string;
  description: string;
  color: string;
  imageUrl?: string;
  thumbnail?: string;
  footer?: string;
  channelId?: string;
  messageId?: string;
  componentType: 'BUTTONS' | 'SELECT';
  buttonStyle: 'PRIMARY' | 'SECONDARY' | 'SUCCESS' | 'DANGER';
  selectPlaceholder: string;
  categories: TicketCategory[];
  enabled: boolean;
}

interface OpenTicket {
  id: string;
  number: number;
  channelId: string;
  channelName: string;
  userId: string;
  userName: string;
  categoryName?: string;
  createdAt: string;
  subject?: string;
  claimedBy?: string;
}

interface Role {
  id: string;
  name: string;
  color: number;
}

// Message config for rich embeds
interface MessageConfig {
  enabled: boolean;
  content?: string;
  embed?: {
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
    timestamp?: boolean;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  };
  buttons?: Array<{
    label: string;
    style: 'PRIMARY' | 'SECONDARY' | 'SUCCESS' | 'DANGER' | 'LINK';
    emoji?: string;
    url?: string;
    customId?: string;
  }>;
}

// Default message configs
const DEFAULT_MESSAGE_CONFIGS: Record<string, MessageConfig> = {
  welcome: {
    enabled: true,
    content: '{user}',
    embed: {
      enabled: true,
      title: '🎫 Ticket Created',
      description: 'Hello {user}, thank you for creating a ticket!\n\nA staff member will be with you shortly. Please describe your issue in detail.',
      color: '#5865F2',
      timestamp: true,
      footer: 'Ticket #{ticket}',
      fields: [],
    },
  },
  claim: {
    enabled: true,
    embed: {
      enabled: true,
      title: '✋ Ticket Claimed',
      description: '**{staff}** has claimed this ticket.\n\n{user}, a staff member is now assisting you. Please provide any additional information needed.',
      color: '#57F287',
      timestamp: true,
    },
  },
  close: {
    enabled: true,
    embed: {
      enabled: true,
      title: '🔒 Ticket Closed',
      description: 'This ticket has been closed by {staff}.\n\n{reason}',
      color: '#ED4245',
      timestamp: true,
      footer: 'Thank you for using our support system',
    },
  },
  thankYou: {
    enabled: true,
    embed: {
      enabled: true,
      title: '💖 Thank You!',
      description: 'Thank you for contacting support!\n\nWe hope we were able to help you. If you have any more questions, feel free to open a new ticket.',
      color: '#EB459E',
      timestamp: true,
    },
  },
  ratingReview: {
    enabled: true,
    embed: {
      enabled: true,
      title: '📝 New Ticket Review',
      description: '{review}',
      color: '#57F287',
      timestamp: true,
      fields: [
        { name: 'Rating', value: '{starsDisplay}', inline: true },
        { name: 'From', value: '{user}', inline: true },
        { name: 'Ticket', value: '{ticket}', inline: true },
        { name: 'Staff', value: '{staff}', inline: true },
      ],
    },
  },
  reopen: {
    enabled: true,
    embed: {
      enabled: true,
      title: '🔓 Ticket Reopened',
      description: 'This ticket has been reopened by {user}.\n\nA staff member will assist you shortly.',
      color: '#57F287',
      timestamp: true,
    },
  },
};

// Available placeholders
const MESSAGE_PLACEHOLDERS = [
  { key: '{user}', description: 'Mention the ticket creator', example: '@Username' },
  { key: '{username}', description: 'Username without mention', example: 'Username' },
  { key: '{staff}', description: 'Mention the staff member', example: '@Staff' },
  { key: '{staffname}', description: 'Staff username without mention', example: 'Staff' },
  { key: '{ticket}', description: 'Ticket number', example: '#1234' },
  { key: '{ticketId}', description: 'Ticket ID', example: 'abc123' },
  { key: '{server}', description: 'Server name', example: 'My Server' },
  { key: '{channel}', description: 'Channel mention', example: '#ticket-1234' },
  { key: '{category}', description: 'Ticket category name', example: 'General Support' },
  { key: '{reason}', description: 'Close reason', example: 'Issue resolved' },
  { key: '{time}', description: 'Current time', example: '14:30' },
  { key: '{date}', description: 'Current date', example: '25/01/2026' },
  { key: '{transcript}', description: 'Transcript link', example: 'https://...' },
  { key: '{stars}', description: 'Rating stars (number)', example: '5' },
  { key: '{starsDisplay}', description: 'Star display', example: '⭐⭐⭐⭐⭐' },
  { key: '{review}', description: 'Review text', example: 'Great support!' },
];

// Default new category
const DEFAULT_CATEGORY: Omit<TicketCategory, 'id'> = {
  name: 'General Support',
  emoji: '🎫',
  description: 'General support inquiries',
  pingRoleIds: [],
  pingUserIds: [],
  formEnabled: false,
  formQuestions: [],
  claimEnabled: true,
  sortOrder: 0,
  enabled: true,
};

// Default new panel
const DEFAULT_PANEL: Omit<TicketPanel, 'id'> = {
  name: 'main',
  title: '🎫 Support Tickets',
  description: 'Need help? Select a category below to open a support ticket.\n\n**Our team will respond as soon as possible.**',
  color: '#5865F2',
  componentType: 'SELECT',
  buttonStyle: 'PRIMARY',
  selectPlaceholder: 'Select a category...',
  categories: [],
  enabled: true,
};

// Component type options
const COMPONENT_TYPES = [
  { value: 'SELECT', label: 'Select Menu', icon: '📋', description: 'Dropdown menu to choose category' },
  { value: 'BUTTONS', label: 'Buttons', icon: '🔘', description: 'Individual buttons for each category' },
];

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
];

// Button style options
const BUTTON_STYLES = [
  { value: 'PRIMARY', label: 'Blue', className: 'bg-[#5865F2] text-white' },
  { value: 'SECONDARY', label: 'Gray', className: 'bg-[#4f545c] text-white' },
  { value: 'SUCCESS', label: 'Green', className: 'bg-[#57F287] text-black' },
  { value: 'DANGER', label: 'Red', className: 'bg-[#ED4245] text-white' },
];

export default function TicketsPage() {
  const { guildId, guilds, loading: guildsLoading, error: guildsError } = useSelectedGuild();
  const { setSelectedGuildId } = useGuildContext();
  const [activeTab, setActiveTab] = useState('panels');
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingPanel, setSendingPanel] = useState(false);
  
  // Data
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [panels, setPanels] = useState<TicketPanel[]>([]);
  const [openTickets, setOpenTickets] = useState<OpenTicket[]>([]);
  
  // Global settings
  const [globalSettings, setGlobalSettings] = useState({
    ticketsEnabled: true,
    defaultCategoryId: '',
    logChannelId: '',
    transcriptChannelId: '',
    ratingChannelId: '',
    maxPerUser: 3,
    cooldownMinutes: 5,
    reopenEnabled: true,
    deleteDelay: 0,
  });

  // Message configs (separate state for better management)
  const [messageConfigs, setMessageConfigs] = useState<Record<string, MessageConfig>>(DEFAULT_MESSAGE_CONFIGS);
  const [selectedMessageType, setSelectedMessageType] = useState<string>('welcome');
  
  // Dialog states
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<TicketPanel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null);
  const [selectedPanelForCategory, setSelectedPanelForCategory] = useState<string | null>(null);
  
  // Close ticket dialog
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedTicketToClose, setSelectedTicketToClose] = useState<OpenTicket | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [closingTicket, setClosingTicket] = useState<string | null>(null);
  
  // Send panel states
  const [sendPanelDialogOpen, setSendPanelDialogOpen] = useState(false);
  const [selectedPanelToSend, setSelectedPanelToSend] = useState<TicketPanel | null>(null);
  const [sendToChannelId, setSendToChannelId] = useState('');

  const loading = guildsLoading || dataLoading;
  const error = guildsError;

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!guildId) return;
    
    setDataLoading(true);
    try {
      const [channelsRes, rolesRes, panelsRes, settingsRes, ticketsRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/channels`),
        fetch(`/api/guilds/${guildId}/roles`),
        fetch(`/api/guilds/${guildId}/tickets/panels`),
        fetch(`/api/guilds/${guildId}/tickets/settings`),
        fetch(`/api/guilds/${guildId}/tickets/open`),
      ]);

      if (channelsRes.ok) {
        const { data } = await channelsRes.json();
        setChannels(data || []);
      }
      
      if (rolesRes.ok) {
        const { data } = await rolesRes.json();
        setRoles(data || []);
      }
      
      if (panelsRes.ok) {
        const { data } = await panelsRes.json();
        setPanels(data || []);
      }
      
      if (settingsRes.ok) {
        const { data } = await settingsRes.json();
        if (data) {
          setGlobalSettings(prev => ({ ...prev, ...data }));
          // Load message configs from API
          if (data.messageConfigs) {
            setMessageConfigs(prev => ({ ...prev, ...data.messageConfigs }));
          }
        }
      }
      
      if (ticketsRes.ok) {
        const { data } = await ticketsRes.json();
        setOpenTickets(data || []);
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

  // Save global settings (including message configs)
  const handleSaveSettings = async () => {
    if (!guildId) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...globalSettings,
          messageConfigs, // Include message configs
        }),
      });
      
      if (res.ok) {
        toast.success('Settings saved!');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Save panel
  const handleSavePanel = async (panel: TicketPanel) => {
    if (!guildId) return;
    
    setSaving(true);
    try {
      const isNew = !panels.find(p => p.id === panel.id);
      const method = isNew ? 'POST' : 'PATCH';
      const url = isNew 
        ? `/api/guilds/${guildId}/tickets/panels`
        : `/api/guilds/${guildId}/tickets/panels/${panel.id}`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(panel),
      });
      
      if (res.ok) {
        const { data } = await res.json();
        if (isNew) {
          setPanels(prev => [...prev, data]);
        } else {
          setPanels(prev => prev.map(p => p.id === panel.id ? data : p));
        }
        toast.success(isNew ? 'Panel created!' : 'Panel updated!');
        setEditPanelOpen(false);
        setSelectedPanel(null);
      } else {
        toast.error('Failed to save panel');
      }
    } catch {
      toast.error('Failed to save panel');
    } finally {
      setSaving(false);
    }
  };

  // Delete panel
  const handleDeletePanel = async (panelId: string) => {
    if (!guildId || !confirm('Are you sure you want to delete this panel?')) return;
    
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets/panels/${panelId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setPanels(prev => prev.filter(p => p.id !== panelId));
        toast.success('Panel deleted');
      } else {
        toast.error('Failed to delete panel');
      }
    } catch {
      toast.error('Failed to delete panel');
    }
  };

  // Save category
  const handleSaveCategory = async (category: TicketCategory, panelId: string) => {
    if (!guildId) return;
    
    setSaving(true);
    try {
      const panel = panels.find(p => p.id === panelId);
      if (!panel) return;
      
      const isNew = !panel.categories.find(c => c.id === category.id);
      
      const updatedCategories = isNew
        ? [...panel.categories, category]
        : panel.categories.map(c => c.id === category.id ? category : c);
      
      const res = await fetch(`/api/guilds/${guildId}/tickets/panels/${panelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedCategories }),
      });
      
      if (res.ok) {
        const { data } = await res.json();
        setPanels(prev => prev.map(p => p.id === panelId ? data : p));
        toast.success(isNew ? 'Category created!' : 'Category updated!');
        setEditCategoryOpen(false);
        setSelectedCategory(null);
        setSelectedPanelForCategory(null);
      } else {
        toast.error('Failed to save category');
      }
    } catch {
      toast.error('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string, panelId: string) => {
    if (!guildId || !confirm('Are you sure you want to delete this category?')) return;
    
    try {
      const panel = panels.find(p => p.id === panelId);
      if (!panel) return;
      
      const updatedCategories = panel.categories.filter(c => c.id !== categoryId);
      
      const res = await fetch(`/api/guilds/${guildId}/tickets/panels/${panelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedCategories }),
      });
      
      if (res.ok) {
        const { data } = await res.json();
        setPanels(prev => prev.map(p => p.id === panelId ? data : p));
        toast.success('Category deleted');
      } else {
        toast.error('Failed to delete category');
      }
    } catch {
      toast.error('Failed to delete category');
    }
  };

  // Send panel
  const handleSendPanel = async () => {
    if (sendingPanel || !selectedPanelToSend || !sendToChannelId || !guildId) return;
    
    setSendingPanel(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets/panels/${selectedPanelToSend.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: sendToChannelId }),
      });
      
      if (res.ok) {
        toast.success('Panel sent successfully!');
        setSendPanelDialogOpen(false);
        setSelectedPanelToSend(null);
        setSendToChannelId('');
        fetchData(); // Refresh to get updated messageId
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to send panel');
      }
    } catch {
      toast.error('Failed to send panel');
    } finally {
      setSendingPanel(false);
    }
  };

  // Close ticket
  const handleCloseTicket = async () => {
    if (!guildId || !selectedTicketToClose) return;

    setClosingTicket(selectedTicketToClose.id);
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets/${selectedTicketToClose.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: closeReason || 'Closed via dashboard' }),
      });

      if (res.ok) {
        toast.success(`Ticket #${selectedTicketToClose.number} closed`);
        setOpenTickets(prev => prev.filter(t => t.id !== selectedTicketToClose.id));
        setCloseDialogOpen(false);
        setCloseReason('');
        setSelectedTicketToClose(null);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to close ticket');
      }
    } catch {
      toast.error('Failed to close ticket');
    } finally {
      setClosingTicket(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading ticket system...</p>
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

  const categories = channels.filter(c => c.type === 'category');
  const textChannels = channels.filter(c => c.type === 'text' || c.type === 'announcement');

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-cyan-600/20 border border-white/10 p-8">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative flex items-center justify-between flex-wrap gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl blur-lg opacity-50" />
              <div className="relative p-4 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl">
                <Ticket className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Ticket System</h1>
              <p className="text-gray-400 mt-1">Professional support ticket management</p>
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
            
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/30 backdrop-blur border border-white/10">
              <div className={`w-2.5 h-2.5 rounded-full ${globalSettings.ticketsEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-300">
                {globalSettings.ticketsEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <LayoutGrid className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{panels.length}</p>
                <p className="text-xs text-gray-400">Panels</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Tag className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{panels.reduce((acc, p) => acc + p.categories.length, 0)}</p>
                <p className="text-xs text-gray-400">Categories</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Ticket className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{openTickets.length}</p>
                <p className="text-xs text-gray-400">Open Tickets</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{openTickets.filter(t => t.claimedBy).length}</p>
                <p className="text-xs text-gray-400">Claimed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[hsl(220_20%_14%)] border border-white/10 p-1.5 h-auto flex-wrap">
          <TabsTrigger 
            value="panels" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:text-white rounded-lg px-4 py-2.5"
          >
            <LayoutGrid className="w-4 h-4 mr-2" /> Panels & Categories
          </TabsTrigger>
          <TabsTrigger 
            value="messages" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white rounded-lg px-4 py-2.5"
          >
            <MessageSquare className="w-4 h-4 mr-2" /> Messages
            <Badge className="ml-2 bg-pink-500/20 text-pink-400 border-0 text-xs">Pro</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:text-white rounded-lg px-4 py-2.5"
          >
            <Settings className="w-4 h-4 mr-2" /> Settings
          </TabsTrigger>
          <TabsTrigger 
            value="tickets" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:text-white rounded-lg px-4 py-2.5"
          >
            <List className="w-4 h-4 mr-2" /> Open Tickets
            {openTickets.length > 0 && (
              <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-0">{openTickets.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Panels & Categories Tab */}
        <TabsContent value="panels" className="mt-6 space-y-6">
          {/* Create Panel Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setSelectedPanel({ ...DEFAULT_PANEL, id: `temp-${Date.now()}` } as TicketPanel);
                setEditPanelOpen(true);
              }}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" /> Create Panel
            </Button>
          </div>

          {/* Panels List */}
          {panels.length === 0 ? (
            <Card className="bg-[hsl(220_20%_14%)] border-white/10">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 mb-4">
                  <LayoutGrid className="h-12 w-12 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Panels Created</h3>
                <p className="text-gray-400 text-center max-w-md mb-6">
                  Create your first ticket panel to start managing support requests. Each panel can have multiple categories with custom forms and role pings.
                </p>
                <Button
                  onClick={() => {
                    setSelectedPanel({ ...DEFAULT_PANEL, id: `temp-${Date.now()}` } as TicketPanel);
                    setEditPanelOpen(true);
                  }}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" /> Create First Panel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {panels.map((panel) => (
                <Card key={panel.id} className="bg-[hsl(220_20%_14%)] border-white/10 overflow-hidden">
                  {/* Panel Header */}
                  <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${panel.color}20` }}
                        >
                          <Layers className="h-6 w-6" style={{ color: panel.color }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-semibold text-white">{panel.title}</h3>
                            <Badge className={panel.enabled ? 'bg-emerald-500/20 text-emerald-400 border-0' : 'bg-red-500/20 text-red-400 border-0'}>
                              {panel.enabled ? 'Active' : 'Disabled'}
                            </Badge>
                            {panel.messageId && (
                              <Badge className="bg-blue-500/20 text-blue-400 border-0">
                                <Check className="h-3 w-3 mr-1" /> Sent
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1">
                            {panel.categories.length} {panel.categories.length === 1 ? 'category' : 'categories'}
                            {panel.channelId && ` • Sent to #${channels.find(c => c.id === panel.channelId)?.name || 'unknown'}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/10 text-gray-300 hover:bg-white/5"
                          onClick={() => {
                            setSelectedPanelToSend(panel);
                            setSendPanelDialogOpen(true);
                          }}
                        >
                          <Send className="h-4 w-4 mr-2" /> Send
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/10 text-gray-300 hover:bg-white/5"
                          onClick={() => {
                            setSelectedPanel(panel);
                            setEditPanelOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDeletePanel(panel.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Panel Preview */}
                  <div className="p-6 border-b border-white/10">
                    <div className="flex gap-6">
                      {/* Embed Preview */}
                      <div className="flex-1">
                        <Label className="text-gray-400 text-xs uppercase tracking-wider mb-3 block">Embed Preview</Label>
                        <div className="rounded-lg overflow-hidden bg-[#2b2d31] max-w-md">
                          <div className="flex">
                            <div className="w-1" style={{ backgroundColor: panel.color }} />
                            <div className="flex-1 p-4">
                              <h4 className="font-semibold text-white">{panel.title}</h4>
                              <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">{panel.description}</p>
                              {panel.imageUrl && (
                                <div className="mt-3 rounded-md overflow-hidden">
                                  <img src={panel.imageUrl} alt="Panel" className="w-full h-auto max-h-48 object-cover" />
                                </div>
                              )}
                              {panel.footer && (
                                <p className="text-xs text-gray-500 mt-3">{panel.footer}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Component Preview */}
                      <div className="w-72">
                        <Label className="text-gray-400 text-xs uppercase tracking-wider mb-3 block">
                          {panel.componentType === 'SELECT' ? 'Select Menu' : 'Buttons'}
                        </Label>
                        {panel.categories.length === 0 ? (
                          <p className="text-gray-500 text-sm">No categories yet</p>
                        ) : panel.componentType === 'SELECT' ? (
                          /* Select Menu Preview */
                          <div className="bg-[#1e1f22] rounded-md border border-[#3f4147] overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#2b2d31]">
                              <span className="text-[#949ba4] text-sm">{panel.selectPlaceholder || 'Select a category...'}</span>
                              <ChevronDown className="h-4 w-4 text-[#949ba4]" />
                            </div>
                            <div className="border-t border-[#3f4147] max-h-40 overflow-y-auto">
                              {panel.categories.map((cat) => (
                                <div
                                  key={cat.id}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-[#4752c4] cursor-pointer"
                                >
                                  {cat.emoji && <span className="text-base">{cat.emoji}</span>}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{cat.name}</p>
                                    {cat.description && (
                                      <p className="text-[#949ba4] text-xs truncate">{cat.description}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* Buttons Preview */
                          <div className="space-y-2">
                            {panel.categories.map((cat) => (
                              <button
                                key={cat.id}
                                className={`w-full px-4 py-2 rounded text-sm font-medium flex items-center gap-2 ${
                                  BUTTON_STYLES.find(s => s.value === panel.buttonStyle)?.className
                                }`}
                              >
                                {cat.emoji && <span>{cat.emoji}</span>}
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Categories */}
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-gray-400 text-xs uppercase tracking-wider">Categories</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 text-gray-300 hover:bg-white/5"
                        onClick={() => {
                          setSelectedCategory({ ...DEFAULT_CATEGORY, id: `temp-${Date.now()}` } as TicketCategory);
                          setSelectedPanelForCategory(panel.id);
                          setEditCategoryOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Category
                      </Button>
                    </div>

                    {panel.categories.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
                        <Tag className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No categories yet. Add one to get started.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {panel.categories.map((category, idx) => (
                          <div 
                            key={category.id}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-gray-500">
                                  <GripVertical className="h-4 w-4" />
                                  <span className="text-xs font-mono">#{idx + 1}</span>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-lg">
                                  {category.emoji || '🎫'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{category.name}</span>
                                    {!category.enabled && (
                                      <Badge className="bg-yellow-500/20 text-yellow-400 border-0 text-xs">Disabled</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                    {category.pingRoleIds.length > 0 && (
                                      <span className="flex items-center gap-1">
                                        <AtSign className="h-3 w-3" />
                                        {category.pingRoleIds.length} role ping{category.pingRoleIds.length !== 1 && 's'}
                                      </span>
                                    )}
                                    {category.formEnabled && (
                                      <span className="flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        Form ({category.formQuestions?.length || 0})
                                      </span>
                                    )}
                                    {category.claimEnabled && (
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        Claimable
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-400 hover:text-white hover:bg-white/10"
                                  onClick={() => {
                                    setSelectedCategory(category);
                                    setSelectedPanelForCategory(panel.id);
                                    setEditCategoryOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  onClick={() => handleDeleteCategory(category.id, panel.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Messages Tab - Rich Embed Builder */}
        <TabsContent value="messages" className="mt-6">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Message Types Sidebar */}
            <div className="lg:col-span-1 space-y-2">
              <Label className="text-gray-400 text-xs uppercase tracking-wider px-2">Message Types</Label>
              {[
                { key: 'welcome', label: 'Welcome', icon: '👋', color: 'blue' },
                { key: 'claim', label: 'Claim', icon: '✋', color: 'green' },
                { key: 'close', label: 'Close', icon: '🔒', color: 'red' },
                { key: 'thankYou', label: 'Thank You', icon: '💖', color: 'pink' },
                { key: 'ratingReview', label: 'Rating Review', icon: '⭐', color: 'yellow' },
                { key: 'reopen', label: 'Reopen', icon: '🔓', color: 'emerald' },
              ].map((type) => (
                <button
                  key={type.key}
                  onClick={() => setSelectedMessageType(type.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                    selectedMessageType === type.key
                      ? `bg-${type.color}-500/20 border border-${type.color}-500/30 text-white`
                      : 'bg-white/5 border border-transparent text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-xl">{type.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{type.label}</p>
                    <p className="text-xs text-gray-500">
                      {messageConfigs[type.key]?.enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  {selectedMessageType === type.key && (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Message Editor */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-[hsl(220_20%_14%)] border-white/10">
                <CardHeader className="border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20">
                        <Wand2 className="h-5 w-5 text-pink-400" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Message Editor</CardTitle>
                        <CardDescription className="text-gray-400">
                          Customize the {selectedMessageType} message
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={messageConfigs[selectedMessageType]?.enabled ?? true}
                      onCheckedChange={(checked) => setMessageConfigs(prev => ({
                        ...prev,
                        [selectedMessageType]: { ...prev[selectedMessageType], enabled: checked }
                      }))}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Plain Text Content */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-400" />
                        Text Content
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-7 text-xs">
                            <Code className="h-3 w-3 mr-1" /> Variables
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-[hsl(220_20%_14%)] border-white/10 p-3">
                          <Label className="text-gray-300 text-sm mb-2 block">Available Variables</Label>
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {MESSAGE_PLACEHOLDERS.map((p) => (
                              <button
                                key={p.key}
                                onClick={() => {
                                  const current = messageConfigs[selectedMessageType]?.content || '';
                                  setMessageConfigs(prev => ({
                                    ...prev,
                                    [selectedMessageType]: {
                                      ...prev[selectedMessageType],
                                      content: current + p.key
                                    }
                                  }));
                                }}
                                className="text-left p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                              >
                                <code className="text-cyan-400 text-xs">{p.key}</code>
                                <p className="text-gray-500 text-xs mt-0.5 truncate">{p.description}</p>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Textarea
                      value={messageConfigs[selectedMessageType]?.content || ''}
                      onChange={(e) => setMessageConfigs(prev => ({
                        ...prev,
                        [selectedMessageType]: { ...prev[selectedMessageType], content: e.target.value }
                      }))}
                      placeholder="Message content (shown above embed)..."
                      rows={2}
                      className="bg-[hsl(220_20%_10%)] border-white/10 text-white placeholder:text-gray-500 font-mono text-sm"
                    />
                  </div>

                  {/* Embed Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-400" />
                      <span className="text-gray-300 text-sm">Enable Rich Embed</span>
                    </div>
                    <Switch
                      checked={messageConfigs[selectedMessageType]?.embed?.enabled ?? true}
                      onCheckedChange={(checked) => setMessageConfigs(prev => ({
                        ...prev,
                        [selectedMessageType]: {
                          ...prev[selectedMessageType],
                          embed: { ...prev[selectedMessageType]?.embed, enabled: checked }
                        }
                      }))}
                    />
                  </div>

                  {messageConfigs[selectedMessageType]?.embed?.enabled && (
                    <>
                      {/* Embed Title */}
                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm">Embed Title</Label>
                        <Input
                          value={messageConfigs[selectedMessageType]?.embed?.title || ''}
                          onChange={(e) => setMessageConfigs(prev => ({
                            ...prev,
                            [selectedMessageType]: {
                              ...prev[selectedMessageType],
                              embed: { ...prev[selectedMessageType]?.embed, title: e.target.value }
                            }
                          }))}
                          placeholder="Embed title..."
                          className="bg-[hsl(220_20%_10%)] border-white/10 text-white"
                        />
                      </div>

                      {/* Embed Description */}
                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm">Embed Description</Label>
                        <Textarea
                          value={messageConfigs[selectedMessageType]?.embed?.description || ''}
                          onChange={(e) => setMessageConfigs(prev => ({
                            ...prev,
                            [selectedMessageType]: {
                              ...prev[selectedMessageType],
                              embed: { ...prev[selectedMessageType]?.embed, description: e.target.value }
                            }
                          }))}
                          placeholder="Embed description with **markdown** support..."
                          rows={4}
                          className="bg-[hsl(220_20%_10%)] border-white/10 text-white placeholder:text-gray-500 font-mono text-sm"
                        />
                      </div>

                      {/* Embed Color */}
                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm">Embed Color</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={messageConfigs[selectedMessageType]?.embed?.color || '#5865F2'}
                            onChange={(e) => setMessageConfigs(prev => ({
                              ...prev,
                              [selectedMessageType]: {
                                ...prev[selectedMessageType],
                                embed: { ...prev[selectedMessageType]?.embed, color: e.target.value }
                              }
                            }))}
                            className="h-10 w-16 rounded border-0 cursor-pointer"
                          />
                          <div className="flex flex-wrap gap-1">
                            {COLOR_PRESETS.map((preset) => (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => setMessageConfigs(prev => ({
                                  ...prev,
                                  [selectedMessageType]: {
                                    ...prev[selectedMessageType],
                                    embed: { ...prev[selectedMessageType]?.embed, color: preset.value }
                                  }
                                }))}
                                className="w-6 h-6 rounded border-2 border-transparent hover:border-white/50 transition-all"
                                style={{ backgroundColor: preset.value }}
                                title={preset.name}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Images */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-gray-300 text-sm flex items-center gap-2">
                            <Image className="h-3 w-3" /> Thumbnail URL
                          </Label>
                          <Input
                            value={messageConfigs[selectedMessageType]?.embed?.thumbnail || ''}
                            onChange={(e) => setMessageConfigs(prev => ({
                              ...prev,
                              [selectedMessageType]: {
                                ...prev[selectedMessageType],
                                embed: { ...prev[selectedMessageType]?.embed, thumbnail: e.target.value }
                              }
                            }))}
                            placeholder="https://..."
                            className="bg-[hsl(220_20%_10%)] border-white/10 text-white text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-300 text-sm flex items-center gap-2">
                            <Image className="h-3 w-3" /> Image URL
                          </Label>
                          <Input
                            value={messageConfigs[selectedMessageType]?.embed?.image || ''}
                            onChange={(e) => setMessageConfigs(prev => ({
                              ...prev,
                              [selectedMessageType]: {
                                ...prev[selectedMessageType],
                                embed: { ...prev[selectedMessageType]?.embed, image: e.target.value }
                              }
                            }))}
                            placeholder="https://..."
                            className="bg-[hsl(220_20%_10%)] border-white/10 text-white text-xs"
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="space-y-2">
                        <Label className="text-gray-300 text-sm">Footer Text</Label>
                        <div className="flex gap-2">
                          <Input
                            value={messageConfigs[selectedMessageType]?.embed?.footer || ''}
                            onChange={(e) => setMessageConfigs(prev => ({
                              ...prev,
                              [selectedMessageType]: {
                                ...prev[selectedMessageType],
                                embed: { ...prev[selectedMessageType]?.embed, footer: e.target.value }
                              }
                            }))}
                            placeholder="Footer text..."
                            className="bg-[hsl(220_20%_10%)] border-white/10 text-white flex-1"
                          />
                          <Input
                            value={messageConfigs[selectedMessageType]?.embed?.footerIcon || ''}
                            onChange={(e) => setMessageConfigs(prev => ({
                              ...prev,
                              [selectedMessageType]: {
                                ...prev[selectedMessageType],
                                embed: { ...prev[selectedMessageType]?.embed, footerIcon: e.target.value }
                              }
                            }))}
                            placeholder="Icon URL"
                            className="bg-[hsl(220_20%_10%)] border-white/10 text-white w-32"
                          />
                        </div>
                      </div>

                      {/* Timestamp Toggle */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-400" />
                          <span className="text-gray-300 text-sm">Show Timestamp</span>
                        </div>
                        <Switch
                          checked={messageConfigs[selectedMessageType]?.embed?.timestamp ?? true}
                          onCheckedChange={(checked) => setMessageConfigs(prev => ({
                            ...prev,
                            [selectedMessageType]: {
                              ...prev[selectedMessageType],
                              embed: { ...prev[selectedMessageType]?.embed, timestamp: checked }
                            }
                          }))}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Save Button */}
              <Button 
                onClick={handleSaveSettings} 
                disabled={saving} 
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save All Messages
              </Button>
            </div>

            {/* Live Preview */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-[hsl(220_20%_14%)] border-white/10 sticky top-4">
                <CardHeader className="border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/20">
                      <Eye className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white">Live Preview</CardTitle>
                      <CardDescription className="text-gray-400">Discord message preview</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Discord-style Preview */}
                  <div className="bg-[#313338] rounded-lg p-4 space-y-2">
                    {/* Bot Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">Support Bot</span>
                          <span className="px-1.5 py-0.5 bg-[#5865f2] text-white text-[10px] font-medium rounded">BOT</span>
                          <span className="text-gray-500 text-xs">Today at {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        
                        {/* Content */}
                        {messageConfigs[selectedMessageType]?.content && (
                          <p className="text-[#dbdee1] text-sm mt-1">
                            {messageConfigs[selectedMessageType].content
                              .replace(/{user}/g, '@Username')
                              .replace(/{staff}/g, '@Staff')
                              .replace(/{ticket}/g, '1234')
                              .replace(/{server}/g, 'My Server')
                            }
                          </p>
                        )}

                        {/* Embed */}
                        {messageConfigs[selectedMessageType]?.embed?.enabled && (
                          <div className="mt-2 rounded overflow-hidden bg-[#2b2d31] max-w-md">
                            <div className="flex">
                              <div 
                                className="w-1 flex-shrink-0" 
                                style={{ backgroundColor: messageConfigs[selectedMessageType]?.embed?.color || '#5865F2' }} 
                              />
                              <div className="flex-1 p-3">
                                {messageConfigs[selectedMessageType]?.embed?.title && (
                                  <h4 className="font-semibold text-white text-sm">
                                    {messageConfigs[selectedMessageType].embed.title}
                                  </h4>
                                )}
                                {messageConfigs[selectedMessageType]?.embed?.description && (
                                  <p className="text-[#dbdee1] text-sm mt-1 whitespace-pre-wrap">
                                    {messageConfigs[selectedMessageType].embed.description
                                      .replace(/{user}/g, '@Username')
                                      .replace(/{staff}/g, '@Staff')
                                      .replace(/{ticket}/g, '1234')
                                      .replace(/{reason}/g, 'Issue resolved')
                                      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold for preview
                                    }
                                  </p>
                                )}
                                {messageConfigs[selectedMessageType]?.embed?.image && (
                                  <div className="mt-2 rounded overflow-hidden">
                                    <div className="bg-[#1e1f22] h-32 flex items-center justify-center text-gray-500 text-xs">
                                      <Image className="h-8 w-8" />
                                    </div>
                                  </div>
                                )}
                                {(messageConfigs[selectedMessageType]?.embed?.footer || messageConfigs[selectedMessageType]?.embed?.timestamp) && (
                                  <div className="flex items-center gap-2 mt-2 text-xs text-[#949ba4]">
                                    {messageConfigs[selectedMessageType]?.embed?.footer && (
                                      <span>{messageConfigs[selectedMessageType].embed.footer.replace(/{ticket}/g, '1234')}</span>
                                    )}
                                    {messageConfigs[selectedMessageType]?.embed?.footer && messageConfigs[selectedMessageType]?.embed?.timestamp && (
                                      <span>•</span>
                                    )}
                                    {messageConfigs[selectedMessageType]?.embed?.timestamp && (
                                      <span>Today at {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {messageConfigs[selectedMessageType]?.embed?.thumbnail && (
                                <div className="p-3">
                                  <div className="w-20 h-20 rounded bg-[#1e1f22] flex items-center justify-center">
                                    <Image className="h-6 w-6 text-gray-500" />
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
                  <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-400 mt-0.5" />
                      <div className="text-xs text-gray-400">
                        <p className="text-blue-400 font-medium mb-1">Pro Tips</p>
                        <ul className="space-y-1">
                          <li>• Use **text** for bold in descriptions</li>
                          <li>• Variables like {'{user}'} are replaced automatically</li>
                          <li>• Images must be direct URLs ending in .png/.jpg/.gif</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Global Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Master Toggle */}
              <Card className="bg-[hsl(220_20%_14%)] border-white/10 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-emerald-500/20">
                        <Shield className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Ticket System</h3>
                        <p className="text-sm text-gray-400">Enable or disable the entire ticket system</p>
                      </div>
                    </div>
                    <Switch
                      checked={globalSettings.ticketsEnabled}
                      onCheckedChange={(checked) => setGlobalSettings(s => ({ ...s, ticketsEnabled: checked }))}
                    />
                  </div>
                </div>
              </Card>

              {/* Channel Settings */}
              <Card className="bg-[hsl(220_20%_14%)] border-white/10">
                <CardHeader className="border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Hash className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white">Channel Configuration</CardTitle>
                      <CardDescription className="text-gray-400">Where tickets are created and logged</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-yellow-400" />
                        Default Category
                      </Label>
                      <Select 
                        value={globalSettings.defaultCategoryId} 
                        onValueChange={(v) => setGlobalSettings(s => ({ ...s, defaultCategoryId: v }))}
                      >
                        <SelectTrigger className="bg-[hsl(220_20%_10%)] border-white/10 text-white">
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[hsl(220_20%_14%)] border-white/10">
                          {categories.length === 0 ? (
                            <SelectItem value="_none" disabled className="text-gray-500">
                              No categories found
                            </SelectItem>
                          ) : (
                            categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-white/10">
                                📁 {cat.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">Where new ticket channels are created by default</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-400" />
                        Transcript Channel
                      </Label>
                      <ChannelSelector
                        value={globalSettings.transcriptChannelId}
                        onChange={(v) => setGlobalSettings(s => ({ ...s, transcriptChannelId: v }))}
                        channels={channels}
                        types={['text']}
                        placeholder="Select channel..."
                      />
                      <p className="text-xs text-gray-500">Where ticket transcripts are sent</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <List className="h-4 w-4 text-cyan-400" />
                      Log Channel
                    </Label>
                    <ChannelSelector
                      value={globalSettings.logChannelId}
                      onChange={(v) => setGlobalSettings(s => ({ ...s, logChannelId: v }))}
                      channels={channels}
                      types={['text']}
                      placeholder="Select channel..."
                    />
                    <p className="text-xs text-gray-500">Where ticket open/close events are logged</p>
                  </div>
                </CardContent>
              </Card>

              {/* Limits */}
              <Card className="bg-[hsl(220_20%_14%)] border-white/10">
                <CardHeader className="border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/20">
                      <Shield className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white">Limits & Protection</CardTitle>
                      <CardDescription className="text-gray-400">Prevent abuse and spam</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-400" />
                        Max Tickets Per User
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={globalSettings.maxPerUser}
                        onChange={(e) => setGlobalSettings(s => ({ ...s, maxPerUser: parseInt(e.target.value) || 1 }))}
                        className="bg-[hsl(220_20%_10%)] border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-400" />
                        Cooldown (minutes)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        value={globalSettings.cooldownMinutes}
                        onChange={(e) => setGlobalSettings(s => ({ ...s, cooldownMinutes: parseInt(e.target.value) || 0 }))}
                        className="bg-[hsl(220_20%_10%)] border-white/10 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Custom Messages Link */}
              <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20">
                        <MessageSquare className="h-6 w-6 text-pink-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Custom Messages</h3>
                        <p className="text-sm text-gray-400">Use the Messages tab for rich embed customization</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setActiveTab('messages')}
                      className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                    >
                      <Wand2 className="h-4 w-4 mr-2" /> Open Editor
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Rating & Reopen Settings */}
              <Card className="bg-[hsl(220_20%_14%)] border-white/10">
                <CardHeader className="border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                      <Sparkles className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white">Rating & Reopen</CardTitle>
                      <CardDescription className="text-gray-400">Configure post-ticket experience</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Rating Channel */}
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-2">
                      ⭐ Rating Channel
                    </Label>
                    <ChannelSelector
                      value={globalSettings.ratingChannelId}
                      onChange={(v) => setGlobalSettings(s => ({ ...s, ratingChannelId: v }))}
                      channels={channels}
                      types={['text']}
                      placeholder="Select channel for ratings..."
                    />
                    <p className="text-xs text-gray-500">Where user reviews are posted</p>
                  </div>

                  {/* Reopen Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🔓</span>
                      <div>
                        <Label className="text-white font-medium">Allow Reopen</Label>
                        <p className="text-sm text-gray-400">Users can reopen closed tickets</p>
                      </div>
                    </div>
                    <Switch
                      checked={globalSettings.reopenEnabled}
                      onCheckedChange={(checked) => setGlobalSettings(s => ({ ...s, reopenEnabled: checked }))}
                    />
                  </div>

                  {/* Auto Delete Delay */}
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-2">
                      🗑️ Auto Delete Delay (seconds)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={3600}
                      value={globalSettings.deleteDelay}
                      onChange={(e) => setGlobalSettings(s => ({ ...s, deleteDelay: parseInt(e.target.value) || 0 }))}
                      className="bg-[hsl(220_20%_10%)] border-white/10 text-white"
                    />
                    <p className="text-xs text-gray-500">
                      0 = Keep channel open for reopen. Set to e.g. 300 to delete after 5 minutes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Save Button */}
              <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
                <CardContent className="p-6">
                  <Button 
                    onClick={handleSaveSettings} 
                    disabled={saving} 
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg"
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="bg-[hsl(220_20%_14%)] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-400" />
                    Pro Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-400">
                  <p>• Create separate panels for different support types</p>
                  <p>• Use role pings to notify the right team</p>
                  <p>• Enable forms to collect info upfront</p>
                  <p>• Set up transcripts for record keeping</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Open Tickets Tab */}
        <TabsContent value="tickets" className="mt-6">
          <Card className="bg-[hsl(220_20%_14%)] border-white/10">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <Ticket className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Open Tickets</CardTitle>
                    <CardDescription className="text-gray-400">Manage active support tickets</CardDescription>
                  </div>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                  {openTickets.length} open
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {openTickets.length === 0 ? (
                <div className="text-center py-16">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 w-fit mx-auto mb-4">
                    <Ticket className="h-12 w-12 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">All Clear!</h3>
                  <p className="text-gray-400">No open tickets at the moment. Great job!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                            <Ticket className="h-6 w-6 text-emerald-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold">Ticket #{ticket.number}</span>
                              {ticket.claimedBy ? (
                                <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">Claimed</Badge>
                              ) : (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">Open</Badge>
                              )}
                              {ticket.categoryName && (
                                <Badge className="bg-purple-500/20 text-purple-400 border-0 text-xs">{ticket.categoryName}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {ticket.userName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {ticket.channelName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(ticket.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-white/10 text-gray-300 hover:bg-white/5"
                            onClick={() => window.open(`https://discord.com/channels/${guildId}/${ticket.channelId}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => {
                              setSelectedTicketToClose(ticket);
                              setCloseDialogOpen(true);
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Panel Dialog */}
      <Dialog open={editPanelOpen} onOpenChange={setEditPanelOpen}>
        <DialogContent className="bg-[hsl(220_20%_14%)] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedPanel?.id.startsWith('temp-') ? 'Create Panel' : 'Edit Panel'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure your ticket panel appearance and settings
            </DialogDescription>
          </DialogHeader>
          
          {selectedPanel && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Panel Name (Internal)</Label>
                  <Input
                    value={selectedPanel.name}
                    onChange={(e) => setSelectedPanel({ ...selectedPanel, name: e.target.value })}
                    placeholder="main"
                    className="bg-[hsl(220_20%_10%)] border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Enabled</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      checked={selectedPanel.enabled}
                      onCheckedChange={(checked) => setSelectedPanel({ ...selectedPanel, enabled: checked })}
                    />
                    <span className="text-sm text-gray-400">{selectedPanel.enabled ? 'Active' : 'Disabled'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Embed Title</Label>
                <Input
                  value={selectedPanel.title}
                  onChange={(e) => setSelectedPanel({ ...selectedPanel, title: e.target.value })}
                  placeholder="🎫 Support Tickets"
                  className="bg-[hsl(220_20%_10%)] border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Embed Description</Label>
                <Textarea
                  value={selectedPanel.description}
                  onChange={(e) => setSelectedPanel({ ...selectedPanel, description: e.target.value })}
                  placeholder="Click a button below to open a ticket"
                  rows={4}
                  className="bg-[hsl(220_20%_10%)] border-white/10 text-white"
                />
              </div>

              {/* Component Type Selection */}
              <div className="space-y-3">
                <Label className="text-gray-300">Component Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {COMPONENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSelectedPanel({ ...selectedPanel, componentType: type.value as TicketPanel['componentType'] })}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedPanel.componentType === type.value
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div>
                          <p className="text-white font-medium">{type.label}</p>
                          <p className="text-xs text-gray-400">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Menu Placeholder (only show for SELECT type) */}
              {selectedPanel.componentType === 'SELECT' && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Select Placeholder</Label>
                  <Input
                    value={selectedPanel.selectPlaceholder || ''}
                    onChange={(e) => setSelectedPanel({ ...selectedPanel, selectPlaceholder: e.target.value })}
                    placeholder="Select a category..."
                    className="bg-[hsl(220_20%_10%)] border-white/10 text-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Embed Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedPanel.color}
                      onChange={(e) => setSelectedPanel({ ...selectedPanel, color: e.target.value })}
                      className="h-10 w-16 rounded border-0 cursor-pointer"
                    />
                    <div className="flex flex-wrap gap-1">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setSelectedPanel({ ...selectedPanel, color: preset.value })}
                          className="w-6 h-6 rounded border-2 border-transparent hover:border-white/50 transition-all"
                          style={{ backgroundColor: preset.value }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Button Style (only show for BUTTONS type) */}
                {selectedPanel.componentType === 'BUTTONS' && (
                  <div className="space-y-2">
                    <Label className="text-gray-300">Button Style</Label>
                    <Select 
                      value={selectedPanel.buttonStyle} 
                      onValueChange={(v: TicketPanel['buttonStyle']) => setSelectedPanel({ ...selectedPanel, buttonStyle: v })}
                    >
                      <SelectTrigger className="bg-[hsl(220_20%_10%)] border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[hsl(220_20%_14%)] border-white/10">
                        {BUTTON_STYLES.map((style) => (
                          <SelectItem key={style.value} value={style.value} className="text-white hover:bg-white/10">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${style.className}`}>{style.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Image URL (optional)</Label>
                <Input
                  value={selectedPanel.imageUrl || ''}
                  onChange={(e) => setSelectedPanel({ ...selectedPanel, imageUrl: e.target.value || undefined })}
                  placeholder="https://example.com/image.png"
                  className="bg-[hsl(220_20%_10%)] border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Footer (optional)</Label>
                <Input
                  value={selectedPanel.footer || ''}
                  onChange={(e) => setSelectedPanel({ ...selectedPanel, footer: e.target.value || undefined })}
                  placeholder="Powered by KisBot"
                  className="bg-[hsl(220_20%_10%)] border-white/10 text-white"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setEditPanelOpen(false); setSelectedPanel(null); }}
              className="border-white/10 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedPanel && handleSavePanel(selectedPanel)}
              disabled={saving}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedPanel?.id.startsWith('temp-') ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
        <DialogContent className="bg-[hsl(220_20%_14%)] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedCategory?.id.startsWith('temp-') ? 'Create Category' : 'Edit Category'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure category appearance, role pings, and custom forms
            </DialogDescription>
          </DialogHeader>
          
          {selectedCategory && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Emoji</Label>
                  <Input
                    value={selectedCategory.emoji || ''}
                    onChange={(e) => setSelectedCategory({ ...selectedCategory, emoji: e.target.value || undefined })}
                    placeholder="🎫"
                    className="bg-[hsl(220_20%_10%)] border-white/10 text-white text-center"
                    maxLength={4}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-gray-300">Name</Label>
                  <Input
                    value={selectedCategory.name}
                    onChange={(e) => setSelectedCategory({ ...selectedCategory, name: e.target.value })}
                    placeholder="General Support"
                    className="bg-[hsl(220_20%_10%)] border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Description (shown in button tooltip)</Label>
                <Input
                  value={selectedCategory.description || ''}
                  onChange={(e) => setSelectedCategory({ ...selectedCategory, description: e.target.value || undefined })}
                  placeholder="General support inquiries"
                  className="bg-[hsl(220_20%_10%)] border-white/10 text-white"
                />
              </div>

              {/* Role Pings */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-yellow-400" />
                  <Label className="text-white font-medium">Role Pings</Label>
                </div>
                <p className="text-sm text-gray-400">Select roles to ping when a ticket is created with this category</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => {
                    const isSelected = selectedCategory.pingRoleIds.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        onClick={() => {
                          const newRoles = isSelected
                            ? selectedCategory.pingRoleIds.filter(id => id !== role.id)
                            : [...selectedCategory.pingRoleIds, role.id];
                          setSelectedCategory({ ...selectedCategory, pingRoleIds: newRoles });
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span 
                          className="inline-block w-2 h-2 rounded-full mr-2" 
                          style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99AAB5' }} 
                        />
                        {role.name}
                        {isSelected && <Check className="inline h-3 w-3 ml-1" />}
                      </button>
                    );
                  })}
                  {roles.length === 0 && (
                    <p className="text-gray-500 text-sm">No roles found</p>
                  )}
                </div>
              </div>

              {/* Claim Settings */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-purple-400" />
                  <div>
                    <Label className="text-white font-medium">Ticket Claiming</Label>
                    <p className="text-sm text-gray-400">Allow staff to claim tickets</p>
                  </div>
                </div>
                <Switch
                  checked={selectedCategory.claimEnabled}
                  onCheckedChange={(checked) => setSelectedCategory({ ...selectedCategory, claimEnabled: checked })}
                />
              </div>

              {/* Form Settings */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-cyan-400" />
                    <Label className="text-white font-medium">Custom Form</Label>
                  </div>
                  <Switch
                    checked={selectedCategory.formEnabled}
                    onCheckedChange={(checked) => setSelectedCategory({ ...selectedCategory, formEnabled: checked })}
                  />
                </div>
                <p className="text-sm text-gray-400">Collect information from users when they create a ticket (Discord Modal - max 5 fields)</p>
                
                {selectedCategory.formEnabled && (
                  <div className="space-y-4">
                    {/* Form Questions List */}
                    {selectedCategory.formQuestions.length > 0 && (
                      <div className="space-y-3">
                        {selectedCategory.formQuestions.map((question, idx) => (
                          <div 
                            key={question.id}
                            className="p-4 rounded-lg bg-[hsl(220_20%_10%)] border border-white/10"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex flex-col items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-gray-500 hover:text-white hover:bg-white/10"
                                    disabled={idx === 0}
                                    onClick={() => {
                                      const newQuestions = [...selectedCategory.formQuestions];
                                      [newQuestions[idx - 1], newQuestions[idx]] = [newQuestions[idx], newQuestions[idx - 1]];
                                      setSelectedCategory({ ...selectedCategory, formQuestions: newQuestions });
                                    }}
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                  </Button>
                                  <span className="text-xs text-gray-500 font-mono">{idx + 1}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-gray-500 hover:text-white hover:bg-white/10"
                                    disabled={idx === selectedCategory.formQuestions.length - 1}
                                    onClick={() => {
                                      const newQuestions = [...selectedCategory.formQuestions];
                                      [newQuestions[idx], newQuestions[idx + 1]] = [newQuestions[idx + 1], newQuestions[idx]];
                                      setSelectedCategory({ ...selectedCategory, formQuestions: newQuestions });
                                    }}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                <div className="flex-1 space-y-3">
                                  {/* Question Label */}
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={question.label}
                                      onChange={(e) => {
                                        const newQuestions = selectedCategory.formQuestions.map(q =>
                                          q.id === question.id ? { ...q, label: e.target.value } : q
                                        );
                                        setSelectedCategory({ ...selectedCategory, formQuestions: newQuestions });
                                      }}
                                      placeholder="Question label"
                                      className="bg-transparent border-white/10 text-white flex-1"
                                    />
                                    <Badge className={`${
                                      question.type === 'short' ? 'bg-blue-500/20 text-blue-400' :
                                      question.type === 'paragraph' ? 'bg-purple-500/20 text-purple-400' :
                                      question.type === 'select' ? 'bg-cyan-500/20 text-cyan-400' :
                                      'bg-orange-500/20 text-orange-400'
                                    } border-0 text-xs`}>
                                      {FORM_QUESTION_TYPES.find(t => t.value === question.type)?.icon} {question.type}
                                    </Badge>
                                  </div>
                                  
                                  {/* Question Settings */}
                                  <div className="flex flex-wrap items-center gap-3">
                                    {/* Type */}
                                    <Select 
                                      value={question.type}
                                      onValueChange={(value: FormQuestion['type']) => {
                                        const newQuestions = selectedCategory.formQuestions.map(q =>
                                          q.id === question.id ? { ...q, type: value, options: value === 'select' ? ['Option 1'] : [] } : q
                                        );
                                        setSelectedCategory({ ...selectedCategory, formQuestions: newQuestions });
                                      }}
                                    >
                                      <SelectTrigger className="w-[130px] bg-transparent border-white/10 text-white h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-[hsl(220_20%_14%)] border-white/10">
                                        {FORM_QUESTION_TYPES.map(type => (
                                          <SelectItem key={type.value} value={type.value} className="text-white hover:bg-white/10 text-xs">
                                            {type.icon} {type.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    
                                    {/* Placeholder */}
                                    <Input
                                      value={question.placeholder || ''}
                                      onChange={(e) => {
                                        const newQuestions = selectedCategory.formQuestions.map(q =>
                                          q.id === question.id ? { ...q, placeholder: e.target.value } : q
                                        );
                                        setSelectedCategory({ ...selectedCategory, formQuestions: newQuestions });
                                      }}
                                      placeholder="Placeholder text..."
                                      className="flex-1 min-w-[120px] bg-transparent border-white/10 text-white h-8 text-xs"
                                    />
                                    
                                    {/* Required Toggle */}
                                    <button
                                      onClick={() => {
                                        const newQuestions = selectedCategory.formQuestions.map(q =>
                                          q.id === question.id ? { ...q, required: !q.required } : q
                                        );
                                        setSelectedCategory({ ...selectedCategory, formQuestions: newQuestions });
                                      }}
                                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                                        question.required
                                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                          : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'
                                      }`}
                                    >
                                      <ToggleLeft className="h-3 w-3" />
                                      {question.required ? 'Required' : 'Optional'}
                                    </button>
                                  </div>
                                  
                                  {/* Select Options (only for select type) */}
                                  {question.type === 'select' && (
                                    <div className="space-y-2 pt-2 border-t border-white/5">
                                      <Label className="text-gray-400 text-xs">Dropdown Options</Label>
                                      <div className="flex flex-wrap gap-2">
                                        {(question.options || []).map((option, optIdx) => (
                                          <div key={optIdx} className="flex items-center gap-1 bg-white/5 rounded px-2 py-1">
                                            <Input
                                              value={option}
                                              onChange={(e) => {
                                                const newOptions = [...(question.options || [])];
                                                newOptions[optIdx] = e.target.value;
                                                const newQuestions = selectedCategory.formQuestions.map(q =>
                                                  q.id === question.id ? { ...q, options: newOptions } : q
                                                );
                                                setSelectedCategory({ ...selectedCategory, formQuestions: newQuestions });
                                              }}
                                              className="h-6 w-24 bg-transparent border-0 text-white text-xs p-0"
                                              placeholder={`Option ${optIdx + 1}`}
                                            />
                                            <button
                                              onClick={() => {
                                                const newOptions = (question.options || []).filter((_, i) => i !== optIdx);
                                                const newQuestions = selectedCategory.formQuestions.map(q =>
                                                  q.id === question.id ? { ...q, options: newOptions } : q
                                                );
                                                setSelectedCategory({ ...selectedCategory, formQuestions: newQuestions });
                                              }}
                                              className="text-gray-500 hover:text-red-400"
                                            >
                                              <X className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ))}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-xs text-gray-400 hover:text-white"
                                          onClick={() => {
                                            const newOptions = [...(question.options || []), `Option ${(question.options || []).length + 1}`];
                                            const newQuestions = selectedCategory.formQuestions.map(q =>
                                              q.id === question.id ? { ...q, options: newOptions } : q
                                            );
                                            setSelectedCategory({ ...selectedCategory, formQuestions: newQuestions });
                                          }}
                                        >
                                          <Plus className="h-3 w-3 mr-1" /> Add
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                                onClick={() => {
                                  const newQuestions = selectedCategory.formQuestions.filter(q => q.id !== question.id);
                                  setSelectedCategory({ ...selectedCategory, formQuestions: newQuestions });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add Question Button */}
                    {selectedCategory.formQuestions.length < 5 ? (
                      <Button
                        variant="outline"
                        className="w-full border-dashed border-white/20 text-gray-400 hover:text-white hover:bg-white/5"
                        onClick={() => {
                          const newQuestion: FormQuestion = {
                            ...DEFAULT_FORM_QUESTION,
                            id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          };
                          setSelectedCategory({
                            ...selectedCategory,
                            formQuestions: [...selectedCategory.formQuestions, newQuestion],
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question ({selectedCategory.formQuestions.length}/5)
                      </Button>
                    ) : (
                      <Alert className="bg-yellow-500/10 border-yellow-500/30">
                        <AlertDescription className="text-yellow-300 text-sm">
                          Discord Modals support maximum 5 fields. Remove a question to add more.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Form Preview */}
                    {selectedCategory.formQuestions.length > 0 && (
                      <div className="pt-4 border-t border-white/10">
                        <Label className="text-gray-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Eye className="h-3 w-3" /> Form Preview (Discord Modal)
                        </Label>
                        <div className="bg-[#313338] rounded-lg p-4 max-w-sm">
                          <div className="text-white font-semibold mb-4 text-center">Create Ticket - {selectedCategory.name}</div>
                          <div className="space-y-3">
                            {selectedCategory.formQuestions.map((q) => (
                              <div key={q.id} className="space-y-1">
                                <label className="text-[#b5bac1] text-xs uppercase font-semibold flex items-center gap-1">
                                  {q.label || 'Untitled Question'}
                                  {q.required && <span className="text-red-400">*</span>}
                                </label>
                                {q.type === 'paragraph' ? (
                                  <div className="bg-[#1e1f22] rounded px-3 py-2 text-[#949ba4] text-sm min-h-[60px]">
                                    {q.placeholder || 'Enter text...'}
                                  </div>
                                ) : q.type === 'select' ? (
                                  <div className="bg-[#1e1f22] rounded px-3 py-2 text-[#949ba4] text-sm flex items-center justify-between">
                                    <span>{q.placeholder || 'Select an option...'}</span>
                                    <ChevronDown className="h-4 w-4" />
                                  </div>
                                ) : (
                                  <div className="bg-[#1e1f22] rounded px-3 py-2 text-[#949ba4] text-sm">
                                    {q.placeholder || (q.type === 'number' ? 'Enter a number...' : 'Enter text...')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#3f4147]">
                            <button className="px-4 py-2 text-white text-sm hover:underline">Cancel</button>
                            <button className="px-4 py-2 bg-[#5865f2] text-white text-sm rounded font-medium">Submit</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Switch
                  checked={selectedCategory.enabled}
                  onCheckedChange={(checked) => setSelectedCategory({ ...selectedCategory, enabled: checked })}
                />
                <span>Category {selectedCategory.enabled ? 'enabled' : 'disabled'}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setEditCategoryOpen(false); setSelectedCategory(null); setSelectedPanelForCategory(null); }}
              className="border-white/10 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedCategory && selectedPanelForCategory && handleSaveCategory(selectedCategory, selectedPanelForCategory)}
              disabled={saving}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedCategory?.id.startsWith('temp-') ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Panel Dialog */}
      <Dialog open={sendPanelDialogOpen} onOpenChange={setSendPanelDialogOpen}>
        <DialogContent className="bg-[hsl(220_20%_14%)] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Send Panel</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose a channel to send the ticket panel to
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Channel</Label>
              <ChannelSelector
                value={sendToChannelId}
                onChange={setSendToChannelId}
                channels={textChannels}
                types={['text', 'announcement']}
                placeholder="Select channel..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setSendPanelDialogOpen(false); setSelectedPanelToSend(null); setSendToChannelId(''); }}
              className="border-white/10 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendPanel}
              disabled={sendingPanel || !sendToChannelId}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              {sendingPanel && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Send Panel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Ticket Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="bg-[hsl(220_20%_14%)] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Close Ticket #{selectedTicketToClose?.number}</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will close the ticket and generate a transcript.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Close Reason (optional)</Label>
              <Textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Enter a reason for closing this ticket..."
                rows={3}
                className="bg-[hsl(220_20%_10%)] border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCloseDialogOpen(false)}
              className="border-white/10 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCloseTicket}
              disabled={closingTicket === selectedTicketToClose?.id}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {closingTicket === selectedTicketToClose?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Close Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
