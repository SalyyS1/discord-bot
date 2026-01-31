'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface GiveawayFilters {
  status?: 'PENDING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface GiveawayHistoryFiltersProps {
  onFiltersChange: (filters: GiveawayFilters) => void;
  initialFilters?: GiveawayFilters;
}

export function GiveawayHistoryFilters({
  onFiltersChange,
  initialFilters = {},
}: GiveawayHistoryFiltersProps) {
  const [status, setStatus] = useState<string | undefined>(initialFilters.status);
  const [startDate, setStartDate] = useState(initialFilters.startDate || '');
  const [endDate, setEndDate] = useState(initialFilters.endDate || '');
  const [search, setSearch] = useState(initialFilters.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Apply filters whenever any filter changes
  const applyFilters = useCallback(() => {
    const filters: GiveawayFilters = {};

    if (status && status !== 'ALL') {
      filters.status = status as 'PENDING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
    }
    if (startDate) {
      filters.startDate = new Date(startDate).toISOString();
    }
    if (endDate) {
      filters.endDate = new Date(endDate).toISOString();
    }
    if (debouncedSearch) {
      filters.search = debouncedSearch;
    }

    onFiltersChange(filters);
  }, [status, startDate, endDate, debouncedSearch, onFiltersChange]);

  // Auto-apply when debounced search or other filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setStatus(undefined);
    setStartDate('');
    setEndDate('');
    setSearch('');
    setDebouncedSearch('');
    onFiltersChange({});
  };

  const hasActiveFilters = status || startDate || endDate || search;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ENDED">Ended</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Start Date Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        {/* End Date Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Search Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Search Prize</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search prizes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
