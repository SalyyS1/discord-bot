'use client';

import { useState, useMemo } from 'react';
import { Shield, Search, Loader2, X, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useGuildDataOptional } from '@/context/guild-data-provider';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface Role {
  id: string;
  name: string;
  color?: number;
  position?: number;
}

interface RoleSelectorProps {
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  onValueChange?: (value: string) => void;
  roles?: Role[];
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  maxSelections?: number;
  excludeEveryone?: boolean;
  excludeManaged?: boolean;
}

// ═══════════════════════════════════════════════
// Helper: Convert Discord color int to hex
// ═══════════════════════════════════════════════

function intToHex(color: number | undefined): string {
  if (!color || color === 0) return '#99aab5'; // Default Discord gray
  return `#${color.toString(16).padStart(6, '0')}`;
}

// ═══════════════════════════════════════════════
// Role Badge Component
// ═══════════════════════════════════════════════

function RoleBadge({ role, onRemove }: { role: Role; onRemove?: () => void }) {
  const color = intToHex(role.color);
  
  return (
    <Badge
      className="flex items-center gap-1 px-2 py-1 text-xs font-medium border"
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}40`,
        color: color,
      }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {role.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:opacity-70"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </Badge>
  );
}

// ═══════════════════════════════════════════════
// Single Role Selector
// ═══════════════════════════════════════════════

export function RoleSelector({
  value,
  onChange,
  onValueChange,
  roles: propRoles,
  placeholder = 'Select role',
  disabled = false,
  multiple = false,
  maxSelections,
  excludeEveryone = true,
}: RoleSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const guildData = useGuildDataOptional();

  // Use provided roles, context roles, or empty array
  const roles = propRoles ?? guildData?.roles ?? [];
  const loading = !propRoles && guildData?.isLoading;

  // Filter roles
  const filtered = useMemo(() => {
    if (!roles || !Array.isArray(roles)) return [];
    
    let result = [...roles];
    
    // Exclude @everyone
    if (excludeEveryone) {
      result = result.filter((r) => r.name !== '@everyone');
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(query));
    }
    
    // Sort by position (highest first)
    result.sort((a, b) => (b.position || 0) - (a.position || 0));
    
    return result;
  }, [roles, searchQuery, excludeEveryone]);

  // Handle multiple selection
  if (multiple) {
    const selectedIds = Array.isArray(value) ? value : [];
    const selectedRoles = roles?.filter((r) => selectedIds.includes(r.id)) || [];

    const toggleRole = (roleId: string) => {
      if (selectedIds.includes(roleId)) {
        onChange?.(selectedIds.filter((id) => id !== roleId));
      } else if (!maxSelections || selectedIds.length < maxSelections) {
        onChange?.([...selectedIds, roleId]);
      }
    };

    if (loading) {
      return (
        <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-white/10 bg-black/40">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          <span className="text-sm text-gray-400">Loading roles...</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {/* Selected roles */}
        {selectedRoles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedRoles.map((role) => (
              <RoleBadge
                key={role.id}
                role={role}
                onRemove={() => toggleRole(role.id)}
              />
            ))}
          </div>
        )}

        {/* Dropdown */}
        <div className="border border-white/10 rounded-lg bg-[#0f1218] overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-black/40 border-white/10 text-sm text-white placeholder:text-gray-500 h-9"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                No roles found
              </div>
            ) : (
              filtered.map((role) => {
                const isSelected = selectedIds.includes(role.id);
                const isDisabled = !isSelected && !!maxSelections && selectedIds.length >= maxSelections;
                const color = intToHex(role.color);

                return (
                  <button
                    key={role.id}
                    onClick={() => toggleRole(role.id)}
                    disabled={disabled || isDisabled}
                    className={`
                      w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors
                      ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-gray-200 flex-1 truncate">{role.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // Single selection mode
  const handleChange = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  const selectedRole = roles?.find((r) => r.id === value);

  if (loading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-white/10 bg-black/40">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">Loading roles...</span>
      </div>
    );
  }

  return (
    <Select value={value as string} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className="w-full bg-[#0f1218] border-white/10 text-white">
        <SelectValue placeholder={placeholder}>
          {selectedRole && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: intToHex(selectedRole.color) }}
              />
              <span className="text-white">{selectedRole.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-[#1a1d26] border-white/10 max-h-60">
        {/* Search */}
        <div className="p-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-black/40 border-white/10 text-sm text-white placeholder:text-gray-500 h-9"
            />
          </div>
        </div>

        {/* Roles */}
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">
            No roles found
          </div>
        ) : (
          filtered.map((role) => {
            const color = intToHex(role.color);
            return (
              <SelectItem
                key={role.id}
                value={role.id}
                className="text-white hover:bg-white/10 focus:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span>{role.name}</span>
                </div>
              </SelectItem>
            );
          })
        )}
      </SelectContent>
    </Select>
  );
}

// ═══════════════════════════════════════════════
// Multi Role Selector (Alias)
// ═══════════════════════════════════════════════

export function MultiRoleSelector(props: Omit<RoleSelectorProps, 'multiple'>) {
  return <RoleSelector {...props} multiple />;
}
