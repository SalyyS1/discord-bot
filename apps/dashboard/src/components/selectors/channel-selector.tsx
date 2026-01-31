'use client';

import { useState, useMemo } from 'react';
import { Hash, Volume2, Speaker, MessageSquare, Search, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useGuildDataOptional } from '@/context/guild-data-provider';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'category' | 'announcement' | 'forum' | 'stage';
  parentId?: string | null;
  parentName?: string;
}

interface ChannelSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void; // Alias for onChange
  channels?: Channel[];
  types?: Channel['type'][];
  placeholder?: string;
  disabled?: boolean;
}

// ═══════════════════════════════════════════════
// Channel Icon
// ═══════════════════════════════════════════════

function ChannelIcon({ type }: { type: Channel['type'] }) {
  switch (type) {
    case 'voice':
      return <Volume2 className="h-4 w-4 text-gray-400" />;
    case 'stage':
      return <Speaker className="h-4 w-4 text-gray-400" />;
    case 'announcement':
      return <MessageSquare className="h-4 w-4 text-gray-400" />;
    case 'forum':
      return <MessageSquare className="h-4 w-4 text-gray-400" />;
    case 'text':
    default:
      return <Hash className="h-4 w-4 text-gray-400" />;
  }
}

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export function ChannelSelector({
  value,
  onChange,
  onValueChange,
  channels: propChannels,
  types = ['text'],
  placeholder = 'Select channel',
  disabled = false,
}: ChannelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const guildData = useGuildDataOptional();

  // Use onChange or onValueChange (alias support)
  const handleChange = onChange || onValueChange;

  // Use provided channels, context channels, or empty array
  const channels = propChannels ?? guildData?.channels ?? [];
  const loading = !propChannels && guildData?.isLoading;

  // Filter channels by type and group by category
  const { filtered, grouped } = useMemo(() => {
    // Guard against undefined channels
    if (!channels || !Array.isArray(channels)) {
      return { filtered: [], grouped: {} };
    }
    // Filter by type
    let result = channels.filter((c) => types.includes(c.type));

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(query));
    }

    // Group by parent (category)
    const grouped = result.reduce(
      (acc, channel) => {
        const categoryId = channel.parentId || 'none';
        if (!acc[categoryId]) {
          acc[categoryId] = {
            name: channel.parentName || 'Uncategorized',
            channels: [],
          };
        }
        acc[categoryId].channels.push(channel);
        return acc;
      },
      {} as Record<string, { name: string; channels: Channel[] }>
    );

    return { filtered: result, grouped };
  }, [channels, types, searchQuery]);

  // Get selected channel name
  const selectedChannel = channels?.find((c) => c.id === value);

  if (loading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-white/10 bg-black/40">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">Loading channels...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className="w-full bg-black/40 border-white/10 text-white">
        <SelectValue placeholder={placeholder}>
          {selectedChannel && (
            <div className="flex items-center gap-2">
              <ChannelIcon type={selectedChannel.type} />
              <span className="text-white">{selectedChannel.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border-white/10">
        {/* Search */}
        <div className="p-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-black/40 border-white/10 text-sm text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Channels grouped by category */}
        {Object.entries(grouped).length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">
            No channels found
          </div>
        ) : (
          Object.entries(grouped).map(([categoryId, { name, channels: categoryChannels }]) => (
            <SelectGroup key={categoryId}>
              <SelectLabel className="text-xs text-gray-400 uppercase tracking-wider px-2">
                {name}
              </SelectLabel>
              {categoryChannels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id} className="text-white hover:bg-white/10">
                  <div className="flex items-center gap-2">
                    <ChannelIcon type={channel.type} />
                    <span>{channel.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

// ═══════════════════════════════════════════════
// Multi Channel Selector
// ═══════════════════════════════════════════════

interface MultiChannelSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  channels: Channel[];
  types?: Channel['type'][];
  placeholder?: string;
  maxSelections?: number;
  disabled?: boolean;
}

export function MultiChannelSelector({
  value,
  onChange,
  channels = [],
  types = ['text'],
  placeholder = 'Select channels',
  maxSelections,
  disabled = false,
}: MultiChannelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter channels by type
  const filtered = useMemo(() => {
    if (!channels || !Array.isArray(channels)) return [];
    let result = channels.filter((c) => types.includes(c.type));
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(query));
    }
    return result;
  }, [channels, types, searchQuery]);

  const toggleChannel = (channelId: string) => {
    if (value.includes(channelId)) {
      onChange(value.filter((id) => id !== channelId));
    } else if (!maxSelections || value.length < maxSelections) {
      onChange([...value, channelId]);
    }
  };

  const selectedChannels = channels?.filter((c) => value.includes(c.id)) || [];

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selectedChannels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => toggleChannel(channel.id)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-aqua-500/20 text-aqua-400 text-sm hover:bg-aqua-500/30 transition-colors"
              disabled={disabled}
            >
              <ChannelIcon type={channel.type} />
              {channel.name}
              <span className="ml-1">×</span>
            </button>
          ))}
        </div>
      )}

      {/* Search & list */}
      <div className="border border-white/10 rounded-lg bg-surface-1 p-2">
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-2 bg-surface-2 border-white/10"
          disabled={disabled}
        />
        <div className="max-h-40 overflow-y-auto space-y-1">
          {filtered.map((channel) => {
            const isSelected = value.includes(channel.id);
            const isDisabled = !isSelected && !!maxSelections && value.length >= maxSelections;

            return (
              <button
                key={channel.id}
                onClick={() => toggleChannel(channel.id)}
                disabled={disabled || isDisabled}
                className={`
                  w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors
                  ${isSelected ? 'bg-aqua-500/10 text-aqua-400' : 'text-gray-300 hover:bg-white/5'}
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <ChannelIcon type={channel.type} />
                <span>{channel.name}</span>
                {isSelected && <span className="ml-auto text-aqua-400">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
