'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  Play, 
  Square, 
  Settings, 
  Server,
  AlertCircle,
  Clock,
  MoreVertical 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export interface BotCardProps {
  id: string;
  name: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ERROR';
  tier: 'FREE' | 'PRO' | 'ULTRA';
  isRunning: boolean;
  currentGuilds: number;
  botUsername?: string | null;
  botAvatar?: string | null;
  lastError?: string | null;
  onStart?: () => void;
  onStop?: () => void;
  loading?: boolean;
}

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  ACTIVE: { label: 'Online', color: 'bg-green-500', textColor: 'text-green-500' },
  SUSPENDED: { label: 'Stopped', color: 'bg-gray-500', textColor: 'text-gray-500' },
  ERROR: { label: 'Error', color: 'bg-red-500', textColor: 'text-red-500' },
};

const tierConfig = {
  FREE: { label: 'Free', color: 'bg-gray-600' },
  PRO: { label: 'Pro', color: 'bg-blue-600' },
  ULTRA: { label: 'Ultra', color: 'bg-purple-600' },
};

export function BotCard({
  id,
  name,
  status,
  tier,
  isRunning,
  currentGuilds,
  botUsername,
  botAvatar,
  lastError,
  onStart,
  onStop,
  loading,
}: BotCardProps) {
  const statusInfo = statusConfig[status];
  const tierInfo = tierConfig[tier];
  const maxGuilds = tier === 'FREE' ? 1 : tier === 'PRO' ? 2 : 3;

  return (
    <Card className="bg-black/40 border-white/10 backdrop-blur-xl p-5 hover:border-white/20 transition-all">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
            {botAvatar ? (
              <img src={botAvatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <Bot className="w-7 h-7 text-white" />
            )}
          </div>
          {/* Status indicator */}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${statusInfo.color}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{name}</h3>
            <Badge className={`${tierInfo.color} text-white text-xs`}>
              {tierInfo.label}
            </Badge>
          </div>
          
          {botUsername && (
            <p className="text-sm text-gray-400 truncate">@{botUsername}</p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Server className="w-3.5 h-3.5" />
              {currentGuilds}/{maxGuilds} servers
            </span>
            <span className={`flex items-center gap-1 ${statusInfo.textColor}`}>
              <div className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
              {statusInfo.label}
            </span>
          </div>

          {/* Error message */}
          {status === 'ERROR' && lastError && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{lastError}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={onStop}
              disabled={loading}
            >
              <Square className="w-4 h-4 mr-1" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={onStart}
              disabled={loading || status === 'PENDING'}
            >
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="text-gray-400">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/bots/${id}`} className="flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Bot
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
