'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Command,
  Settings,
  Shield,
  Gift,
  MessageSquare,
  Zap,
  Bell,
  Ticket,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════
// Search Item Types
// ═══════════════════════════════════════════════

interface SearchItem {
  id: string;
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'page' | 'setting';
}

// ═══════════════════════════════════════════════
// Searchable Items
// ═══════════════════════════════════════════════

const searchItems: SearchItem[] = [
  // Pages
  { id: 'moderation', title: 'Moderation', href: '/dashboard/moderation', icon: Shield, category: 'page' },
  { id: 'welcome', title: 'Welcome & Goodbye', href: '/dashboard/welcome', icon: Bell, category: 'page' },
  { id: 'messages', title: 'Message Templates', href: '/dashboard/messages', icon: MessageSquare, category: 'page' },
  { id: 'leveling', title: 'Leveling System', href: '/dashboard/leveling', icon: Zap, category: 'page' },
  { id: 'giveaway', title: 'Giveaways', href: '/dashboard/giveaway', icon: Gift, category: 'page' },
  { id: 'tickets', title: 'Ticket System', href: '/dashboard/tickets', icon: Ticket, category: 'page' },
  { id: 'settings', title: 'Settings', href: '/dashboard/settings', icon: Settings, category: 'page' },
  // Settings
  { id: 'anti-spam', title: 'Anti-Spam Settings', href: '/dashboard/moderation#anti-spam', icon: Shield, category: 'setting' },
  { id: 'anti-link', title: 'Anti-Link Settings', href: '/dashboard/moderation#anti-link', icon: Shield, category: 'setting' },
  { id: 'word-filter', title: 'Word Filter', href: '/dashboard/moderation#word-filter', icon: Shield, category: 'setting' },
  { id: 'xp-settings', title: 'XP Settings', href: '/dashboard/leveling#xp-settings', icon: Zap, category: 'setting' },
  { id: 'level-roles', title: 'Level Roles', href: '/dashboard/leveling#level-roles', icon: Zap, category: 'setting' },
];

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

interface HeaderProps {
  title?: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  // Group items by category
  const pages = searchItems.filter((item) => item.category === 'page');
  const settings = searchItems.filter((item) => item.category === 'setting');

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Title */}
        <div>
          {title && <h1 className="text-xl font-semibold text-white">{title}</h1>}
          {description && <p className="text-sm text-gray-400">{description}</p>}
        </div>

        {/* Search */}
        <Button
          variant="outline"
          className="relative h-9 w-full max-w-sm justify-start bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
          onClick={() => setOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="hidden md:inline">Search settings...</span>
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 text-xs text-gray-400 md:flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </Button>
      </div>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages and settings..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {pages.map((item) => (
              <CommandItem
                key={item.id}
                value={item.title}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Settings">
            {settings.map((item) => (
              <CommandItem
                key={item.id}
                value={item.title}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
