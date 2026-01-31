/**
 * Server Selector Component (Enhanced with Guild Access Validation)
 * Displays guilds that user has access to (with MANAGE_GUILD permission and bot present)
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  botPresent: boolean;
}

interface ServerSelectorProps {
  currentGuildId?: string;
}

export function ServerSelector({ currentGuildId }: ServerSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);

  useEffect(() => {
    fetchAccessibleGuilds();
  }, []);

  useEffect(() => {
    if (currentGuildId && guilds.length > 0) {
      const guild = guilds.find((g) => g.id === currentGuildId);
      if (guild) {
        setSelectedGuild(guild);
      }
    }
  }, [currentGuildId, guilds]);

  const fetchAccessibleGuilds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/guilds');

      if (!response.ok) {
        throw new Error('Failed to fetch guilds');
      }

      const data = await response.json();
      setGuilds(data.guilds || []);
    } catch (error) {
      console.error('Error fetching guilds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGuild = (guild: Guild) => {
    setSelectedGuild(guild);
    setOpen(false);
    router.push(`/dashboard/${guild.id}`);
  };

  const getGuildIconUrl = (guildId: string, iconHash: string | null) => {
    if (!iconHash) return null;
    const extension = iconHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${extension}?size=64`;
  };

  if (loading) {
    return (
      <div className="flex h-10 w-[280px] items-center justify-center rounded-md border">
        <p className="text-sm text-muted-foreground">Loading servers...</p>
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="flex h-10 w-[280px] items-center justify-center rounded-md border">
        <p className="text-sm text-muted-foreground">No accessible servers</p>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
        >
          <div className="flex items-center gap-2">
            {selectedGuild ? (
              <>
                {selectedGuild.icon ? (
                  <Image
                    src={getGuildIconUrl(selectedGuild.id, selectedGuild.icon) || ''}
                    alt={selectedGuild.name}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                ) : (
                  <Server className="h-4 w-4" />
                )}
                <span className="truncate">{selectedGuild.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Select server...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search servers..." />
          <CommandEmpty>No servers found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {guilds.map((guild) => (
              <CommandItem
                key={guild.id}
                value={guild.name}
                onSelect={() => handleSelectGuild(guild)}
              >
                <div className="flex w-full items-center gap-2">
                  {guild.icon ? (
                    <Image
                      src={getGuildIconUrl(guild.id, guild.icon) || ''}
                      alt={guild.name}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  ) : (
                    <Server className="h-4 w-4" />
                  )}
                  <span className="flex-1 truncate">{guild.name}</span>
                  <Check
                    className={cn(
                      'h-4 w-4',
                      selectedGuild?.id === guild.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
