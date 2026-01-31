'use client';

import { useState, useMemo } from 'react';
import { Folder, Search, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useGuildDataOptional } from '@/context/guild-data-provider';
import type { Channel } from '@/types/api';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface CategorySelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
  categories?: Channel[];
  placeholder?: string;
  disabled?: boolean;
}

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export function CategorySelector({
  value,
  onChange,
  onValueChange,
  categories: propCategories,
  placeholder = 'Select category',
  disabled = false,
}: CategorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const guildData = useGuildDataOptional();

  const handleChange = onChange || onValueChange;

  // Use provided categories, context categories, or empty array
  const categories = propCategories ?? guildData?.categories ?? [];
  const isLoading = !propCategories && guildData?.isLoading;

  const filtered = useMemo(() => {
    if (!categories?.length) return [];
    if (!searchQuery) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  const selectedCategory = categories.find((c) => c.id === value);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-white/10 bg-black/40">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">Loading categories...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className="w-full bg-black/40 border-white/10 text-white">
        <SelectValue placeholder={placeholder}>
          {selectedCategory && (
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-gray-400" />
              <span className="text-white">{selectedCategory.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border-white/10">
        <div className="p-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-black/40 border-white/10 text-sm text-white"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">
            No categories found
          </div>
        ) : (
          filtered.map((category) => (
            <SelectItem
              key={category.id}
              value={category.id}
              className="text-white hover:bg-white/10"
            >
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-gray-400" />
                <span>{category.name}</span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
