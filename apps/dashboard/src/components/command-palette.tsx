'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Shield,
  MessageSquare,
  Zap,
  Gift,
  Ticket,
  Settings,
  LogOut,
  Search,
  User,
  Reply,
} from 'lucide-react';
import { signOut } from '@/lib/auth-client';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations('nav');

  const navItems: NavItem[] = [
    { href: '/dashboard', label: t('overview'), icon: LayoutDashboard, keywords: 'home overview main' },
    { href: '/dashboard/moderation', label: t('moderation'), icon: Shield, keywords: 'automod spam filter' },
    { href: '/dashboard/messages', label: t('messages'), icon: MessageSquare, keywords: 'custom embed welcome goodbye' },
    { href: '/dashboard/leveling', label: t('leveling'), icon: Zap, keywords: 'xp rank level roles' },
    { href: '/dashboard/giveaway', label: t('giveaway'), icon: Gift, keywords: 'raffle prize contest' },
    { href: '/dashboard/tickets', label: t('tickets'), icon: Ticket, keywords: 'support help panel' },
    { href: '/dashboard/autoresponder', label: t('autoresponder'), icon: Reply, keywords: 'auto response trigger' },
    { href: '/dashboard/settings', label: t('settings'), icon: Settings, keywords: 'config preferences' },
  ];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut();
    router.push('/login');
  }, [router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[hsl(200_25%_8%/0.8)] backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      
      {/* Command Dialog */}
      <div className="absolute left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg px-4">
        <Command 
          className="rounded-xl border border-[hsl(200_20%_25%)] bg-[hsl(200_25%_14%)] shadow-2xl overflow-hidden"
          loop
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-[hsl(200_20%_22%)]">
            <Search className="h-4 w-4 text-[hsl(174_72%_55%)] shrink-0" />
            <Command.Input 
              placeholder="Search pages, actions..."
              className="w-full py-4 bg-transparent text-white placeholder:text-gray-500 outline-none text-sm"
              autoFocus
            />
            <kbd className="hidden sm:inline px-2 py-1 text-xs bg-[hsl(200_22%_18%)] border border-[hsl(200_20%_25%)] rounded text-gray-400">
              ESC
            </kbd>
          </div>
          
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-gray-400">
              No results found.
            </Command.Empty>

            {/* Pages Group */}
            <Command.Group heading="Pages" className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium">
              {navItems.map(item => (
                <Command.Item
                  key={item.href}
                  value={`${item.label} ${item.keywords}`}
                  onSelect={() => runCommand(() => router.push(item.href))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-gray-300 hover:bg-[hsl(200_20%_20%)] hover:text-white data-[selected=true]:bg-[hsl(174_72%_50%/0.15)] data-[selected=true]:text-[hsl(174_72%_60%)] transition-colors"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Actions Group */}
            <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium mt-2">
              <Command.Item
                value="profile account user"
                onSelect={() => runCommand(() => router.push('/dashboard/settings'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-gray-300 hover:bg-[hsl(200_20%_20%)] hover:text-white data-[selected=true]:bg-[hsl(174_72%_50%/0.15)] data-[selected=true]:text-[hsl(174_72%_60%)] transition-colors"
              >
                <User className="h-4 w-4" />
                <span>Profile Settings</span>
              </Command.Item>
              <Command.Item
                value="logout sign out exit"
                onSelect={() => runCommand(handleLogout)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-red-400 hover:bg-[hsl(0_70%_50%/0.1)] data-[selected=true]:bg-[hsl(0_70%_50%/0.15)] transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
          
          {/* Footer hints */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[hsl(200_20%_22%)] text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-[hsl(200_22%_18%)] rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-[hsl(200_22%_18%)] rounded">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-[hsl(200_22%_18%)] rounded">↵</kbd>
                to select
              </span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
