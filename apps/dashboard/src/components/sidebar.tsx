'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Settings,
  Shield,
  Gift,
  MessageSquare,
  Zap,
  Ticket,
  Bot,
  ChevronLeft,
  Crown,
  Reply,
  Home,
  ExternalLink,
  Mic,
  Music,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServerSelector } from '@/components/server-selector';
import { useSidebar } from '@/context/sidebar-context';
import { useSession } from '@/lib/auth-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { data: session } = useSession();

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
      href: '/dashboard/messages',
      label: t('messages'),
      icon: <MessageSquare className="h-5 w-5" />,
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
      icon: <Reply className="h-5 w-5" />,
    },
    {
      href: '/dashboard/bots',
      label: 'My Bots',
      icon: <Bot className="h-5 w-5" />,
    },
    {
      href: '/dashboard/voice',
      label: 'Voice',
      icon: <Mic className="h-5 w-5" />,
    },
    {
      href: '/dashboard/music',
      label: 'Music',
      icon: <Music className="h-5 w-5" />,
    },
    {
      href: '/dashboard/settings',
      label: t('settings'),
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r transition-all duration-200",
        "border-[hsl(200_20%_22%)] bg-[hsl(200_25%_14%)] text-white",
        "dark:border-[hsl(200_20%_22%)] dark:bg-[hsl(200_25%_14%)]",
        "light:border-[hsl(180_15%_88%)] light:bg-white",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 z-50 h-6 w-6 rounded-full bg-[hsl(200_22%_18%)] border border-[hsl(200_20%_25%)] flex items-center justify-center hover:bg-[hsl(200_20%_25%)] transition-colors shadow-lg"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft className={cn(
          "h-4 w-4 text-gray-400 transition-transform duration-200",
          isCollapsed && "rotate-180"
        )} />
      </button>

      <div className="flex h-full flex-col">
        {/* Logo & Server Select */}
        <div className={cn(
          "flex flex-col gap-4 border-b border-[hsl(200_20%_22%)] transition-all duration-200",
          isCollapsed ? "p-3" : "p-6"
        )}>
          <div className={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
              </div>
              {!isCollapsed && (
                <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  SylaBot
                </span>
              )}
            </Link>
            {!isCollapsed && (
              <Link
                href="/"
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                title="Back to Home"
              >
                <Home className="h-4 w-4" />
              </Link>
            )}
          </div>
          {!isCollapsed && <ServerSelector />}
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 space-y-1 overflow-y-auto custom-scrollbar transition-all duration-200",
          isCollapsed ? "p-2" : "p-4"
        )}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'group flex items-center rounded-lg text-sm font-medium transition-colors duration-150',
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
                  isActive
                    ? 'bg-[hsl(174_72%_50%/0.15)] text-[hsl(174_72%_55%)] border border-[hsl(174_72%_50%/0.3)]'
                    : 'text-gray-400 hover:bg-[hsl(200_20%_20%)] hover:text-white border border-transparent'
                )}
              >
                <span className={cn(
                  "shrink-0",
                  isActive ? "text-[hsl(174_72%_55%)]" : "text-gray-500 group-hover:text-gray-300"
                )}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer - User Info */}
        <div className={cn(
          "border-t border-[hsl(200_20%_22%)] bg-[hsl(200_25%_12%)] transition-all duration-200",
          isCollapsed ? "p-2" : "p-4"
        )}>
          <div className={cn(
            "flex items-center rounded-lg bg-[hsl(200_22%_16%)] border border-[hsl(200_20%_22%)] transition-all duration-200",
            isCollapsed ? "justify-center p-2" : "gap-3 p-3"
          )}>
            <Avatar className="h-8 w-8 shrink-0 border border-[hsl(200_20%_25%)]">
              {session?.user?.image && (
                <AvatarImage src={session.user.image} alt={session?.user?.name || 'User'} />
              )}
              <AvatarFallback className="bg-gradient-to-tr from-[hsl(174_72%_45%)] to-[hsl(180_70%_35%)] text-white text-xs">
                {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                  <Crown className="h-3 w-3 text-yellow-500" />
                  Premium Plan
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
