'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import {
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface AuditEntry {
  id: string;
  guildId: string;
  userId: string;
  requestId: string;
  source: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  category: string;
  target?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'SETTINGS':
      return 'bg-blue-500/20 text-blue-400';
    case 'MODERATION':
      return 'bg-red-500/20 text-red-400';
    case 'TICKETS':
      return 'bg-purple-500/20 text-purple-400';
    case 'BILLING':
      return 'bg-green-500/20 text-green-400';
    case 'RATINGS':
      return 'bg-yellow-500/20 text-yellow-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

function AuditLogEntryCard({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = entry.before || entry.after;

  return (
    <Card
      className={`bg-surface-1 border-white/10 ${hasDetails ? 'cursor-pointer' : ''}`}
      onClick={() => hasDetails && setExpanded(!expanded)}
    >
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(entry.category)}`}>
              {entry.category}
            </span>
            <span className="font-medium">{formatAction(entry.action)}</span>
            {entry.target && (
              <span className="text-muted-foreground text-sm">{entry.target}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-mono">
              {entry.userId.slice(0, 8)}...
            </span>
            <span className="text-sm text-muted-foreground">
              {formatRelativeTime(entry.createdAt)}
            </span>
            {hasDetails && (
              expanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )
            )}
          </div>
        </div>

        {expanded && hasDetails && (
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
            {entry.before && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Before</p>
                <pre className="text-xs bg-black/30 p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(entry.before, null, 2)}
                </pre>
              </div>
            )}
            {entry.after && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">After</p>
                <pre className="text-xs bg-black/30 p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(entry.after, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {expanded && (
          <div className="mt-4 border-t border-white/10 pt-4 flex gap-4 text-xs text-muted-foreground">
            <span>Source: {entry.source}</span>
            <span>Request ID: {entry.requestId.slice(0, 8)}...</span>
            {entry.ipAddress && <span>IP: {entry.ipAddress}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AuditLogPage() {
  const params = useParams();
  const guildId = params?.guildId as string;

  const [filters, setFilters] = useState({
    category: 'all',
    search: '',
    limit: 50,
    offset: 0,
  });

  // Build query string
  const queryParams = new URLSearchParams();
  queryParams.set('limit', filters.limit.toString());
  queryParams.set('offset', filters.offset.toString());
  if (filters.category !== 'all') queryParams.set('category', filters.category);
  if (filters.search) queryParams.set('search', filters.search);

  const { data, isLoading, error: _error } = useSWR(
    guildId ? `/api/guilds/${guildId}/audit?${queryParams.toString()}` : null,
    fetcher
  );

  const entries = data?.data?.items || [];
  const total = data?.data?.total || 0;
  const hasMore = data?.data?.hasMore || false;
  const availableCategories = data?.data?.filters?.categories || [];

  const handleExport = (format: 'json' | 'csv') => {
    const exportUrl = `/api/guilds/${guildId}/audit/export?format=${format}`;
    window.open(exportUrl, '_blank');
  };

  if (!guildId) {
    return (
      <div className="p-8">
        <Card className="bg-surface-1 border-white/10">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Audit Log</h2>
            <p className="text-muted-foreground">
              Select a server from the sidebar to view audit logs
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">Track all changes made to your server settings</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, offset: 0 }))}
            className="w-64 pl-10 bg-surface-1 border-white/10"
          />
        </div>

        <select
          value={filters.category}
          onChange={(e) => setFilters(f => ({ ...f, category: e.target.value, offset: 0 }))}
          className="px-4 py-2 rounded-lg bg-surface-1 border border-white/10 text-sm"
        >
          <option value="all">All Categories</option>
          {availableCategories.map((cat: string) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Card className="bg-surface-1 border-white/10 flex-1">
          <CardContent className="py-4 flex items-center gap-4">
            <Shield className="w-8 h-8 text-aqua-400" />
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-sm text-muted-foreground">Total Entries</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-1 rounded-lg animate-pulse" />
          ))
        ) : entries.length === 0 ? (
          <Card className="bg-surface-1 border-white/10">
            <CardContent className="py-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No audit log entries found</p>
            </CardContent>
          </Card>
        ) : (
          entries.map((entry: AuditEntry) => (
            <AuditLogEntryCard key={entry.id} entry={entry} />
          ))
        )}
      </div>

      {/* Pagination */}
      {hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setFilters(f => ({ ...f, offset: f.offset + f.limit }))}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
