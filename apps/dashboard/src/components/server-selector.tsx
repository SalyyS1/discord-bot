'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Plus, Server, Check } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useGuildContext } from '@/context/guild-context';
import { queryKeys } from '@/lib/query-keys';

interface Guild {
    id: string;
    name: string;
    icon: string | null;
}

async function fetchGuildSettings(guildId: string) {
    const res = await fetch(`/api/guilds/${guildId}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    const json = await res.json();
    return json.data || json;
}

export function ServerSelector() {
    const { selectedGuildId, setSelectedGuildId, isInitialized } = useGuildContext();
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [loading, setLoading] = useState(true);
    const queryClient = useQueryClient();

    useEffect(() => {
        async function fetchGuilds() {
            try {
                const res = await fetch('/api/guilds');
                const data = await res.json();
                if (data.guilds) {
                    setGuilds(data.guilds);
                    // Auto-select first guild if none selected
                    if (!selectedGuildId && data.guilds.length > 0) {
                        setSelectedGuildId(data.guilds[0].id);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch guilds', error);
            } finally {
                setLoading(false);
            }
        }
        if (isInitialized) {
            fetchGuilds();
        }
    }, [isInitialized, selectedGuildId, setSelectedGuildId]);

    const selectedGuild = useMemo(() =>
        guilds.find(g => g.id === selectedGuildId) || null,
        [guilds, selectedGuildId]
    );

    /**
     * Handle guild switch with proper cache management:
     * 1. Cancel in-flight queries for old guild
     * 2. Remove old guild cache entirely (not just invalidate)
     * 3. Update selected guild
     * 4. Prefetch new guild data for smooth UX
     */
    const handleSelectGuild = useCallback(async (newGuildId: string) => {
        const oldGuildId = selectedGuildId;

        // 1. Cancel any in-flight queries for OLD guild
        if (oldGuildId) {
            await queryClient.cancelQueries({
                queryKey: queryKeys.guild(oldGuildId),
            });
        }

        // 2. Remove old guild cache entirely (prevents stale data flash)
        if (oldGuildId && oldGuildId !== newGuildId) {
            queryClient.removeQueries({
                queryKey: queryKeys.guild(oldGuildId),
            });
        }

        // 3. Update selected guild (this triggers refetch via enabled flag)
        setSelectedGuildId(newGuildId);

        // 4. Prefetch new guild data for smooth UX
        queryClient.prefetchQuery({
            queryKey: queryKeys.guildSettings(newGuildId),
            queryFn: () => fetchGuildSettings(newGuildId),
            staleTime: 30_000,
        });
    }, [selectedGuildId, setSelectedGuildId, queryClient]);

    if (loading || !isInitialized) {
        return <Skeleton className="h-12 w-full rounded-lg" />;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full justify-between border-white/10 bg-white/5 hover:bg-white/10 text-white"
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        {selectedGuild ? (
                            selectedGuild.icon ? (
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`} />
                                    <AvatarFallback>{selectedGuild.name?.[0] || 'S'}</AvatarFallback>
                                </Avatar>
                            ) : <Server className="h-4 w-4 shrink-0" />
                        ) : <Server className="h-4 w-4 shrink-0" />}
                        <span className="truncate">{selectedGuild?.name || 'Select Server'}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-black/90 text-white border-white/10 backdrop-blur-xl">
                <DropdownMenuLabel>My Servers</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {guilds.length === 0 ? (
                    <DropdownMenuItem disabled className="text-muted-foreground">
                        No servers found
                    </DropdownMenuItem>
                ) : (
                    guilds.map((guild) => (
                        <DropdownMenuItem
                            key={guild.id}
                            onClick={() => handleSelectGuild(guild.id)}
                            className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                        >
                            {guild.icon ? (
                                <Avatar className="mr-2 h-6 w-6">
                                    <AvatarImage src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} />
                                    <AvatarFallback>{guild.name?.[0] || 'S'}</AvatarFallback>
                                </Avatar>
                            ) : <Server className="mr-2 h-4 w-4 shrink-0" />}
                            <span className="truncate flex-1">{guild.name}</span>
                            {guild.id === selectedGuildId && (
                                <Check className="h-4 w-4 text-aqua-400" />
                            )}
                        </DropdownMenuItem>
                    ))
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                    className="cursor-pointer hover:bg-white/10 focus:bg-white/10 text-muted-foreground"
                    onClick={() => window.open(`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1462790510883110965'}&permissions=8&scope=bot%20applications.commands`, '_blank')}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Server
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
