'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Settings,
  Shield,
  Gift,
  Users,
  MessageSquare,
  Zap,
  Bell,
  Ticket,
  Mic,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: t('overview'),
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      href: '/dashboard/moderation',
      label: t('moderation'),
      icon: <Shield className="h-5 w-5" />,
    },
    {
      href: '/dashboard/welcome',
      label: t('welcome'),
      icon: <Bell className="h-5 w-5" />,
    },
    {
      href: '/dashboard/leveling',
      label: t('leveling'),
      icon: <Zap className="h-5 w-5" />,
    },
    {
      href: '/dashboard/giveaway',
      label: t('giveaway'),
      icon: <Gift className="h-5 w-5" />,
    },
    {
      href: '/dashboard/tickets',
      label: t('tickets'),
      icon: <Ticket className="h-5 w-5" />,
    },
    {
      href: '/dashboard/autoresponder',
      label: t('autoresponder'),
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      href: '/dashboard/settings',
      label: t('settings'),
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Bot className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">Bot Dashboard</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
