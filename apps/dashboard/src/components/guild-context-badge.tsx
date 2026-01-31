'use client';

import { useGuildContext } from '@/context/guild-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Server } from 'lucide-react';

interface GuildContextBadgeProps {
    className?: string;
    showName?: boolean;
}

/**
 * Always-visible badge showing current guild context
 */
export function GuildContextBadge({ className, showName = true }: GuildContextBadgeProps) {
    const { selectedGuildId } = useGuildContext();

    // This would typically come from a query, simplified for now
    // In a real implementation, you'd use useGuildSettings or similar

    if (!selectedGuildId) return null;

    return (
        <Badge
            variant="outline"
            className={`border-cyan-500/30 bg-cyan-500/10 text-cyan-300 ${className}`}
        >
            <Server className="mr-1 h-3 w-3" />
            {showName ? 'Server Active' : ''}
        </Badge>
    );
}
