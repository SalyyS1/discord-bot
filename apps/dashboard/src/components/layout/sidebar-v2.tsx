'use client';

import { Link } from '@/i18n/navigation';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Settings,
  Shield,
  Gift,
  MessageSquare,
  Zap,
  Bell,
  Ticket,
  Bot,
  ChevronLeft,
  ChevronRight,
  Crown,
  Users,
  Sparkles,
  Mic,
  Music,
  User,
  ShieldAlert,
  Server,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServerSelector } from '@/components/server-selector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
}

// ═══════════════════════════════════════════════
// Local Storage Key
// ═══════════════════════════════════════════════

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export function SidebarV2() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === 'true') setCollapsed(true);

    // Check admin status
    checkAdminStatus();
  }, []);

  async function checkAdminStatus() {
    try {
      const res = await fetch('/api/admin/stats');
      setIsAdmin(res.ok && res.status !== 403);
    } catch {
      setIsAdmin(false);
    }
  }

  // Persist collapsed state
  const toggleCollapsed = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
  };

  // Grouped navigation items
  const navSections: NavSection[] = [
    {
      title: 'General',
      items: [
        { href: '/dashboard', label: t('overview'), icon: LayoutDashboard },
        { href: '/dashboard/settings', label: t('settings'), icon: Settings },
        { href: '/profile', label: 'Profile', icon: User },
      ],
    },
    {
      title: 'Moderation',
      items: [
        { href: '/dashboard/moderation', label: t('moderation'), icon: Shield },
      ],
    },
    {
      title: 'Community',
      items: [
        { href: '/dashboard/welcome', label: t('welcome'), icon: Bell },
        { href: '/dashboard/messages', label: t('messages'), icon: MessageSquare },
      ],
    },
    {
      title: 'Engagement',
      items: [
        { href: '/dashboard/leveling', label: t('leveling'), icon: Zap },
        { href: '/dashboard/giveaway', label: t('giveaway'), icon: Gift },
      ],
    },
    {
      title: 'Support',
      items: [
        { href: '/dashboard/tickets', label: t('tickets'), icon: Ticket },
        { href: '/dashboard/autoresponder', label: t('autoresponder'), icon: MessageSquare },
      ],
    },
    {
      title: 'Voice & Music',
      items: [
        { href: '/dashboard/voice', label: 'Voice', icon: Mic },
        { href: '/dashboard/music', label: 'Music', icon: Music },
      ],
    },
    {
      title: 'Admin',
      adminOnly: true,
      items: [
        { href: '/admin', label: 'Overview', icon: ShieldAlert },
        { href: '/admin/tenants', label: 'Tenants', icon: Server },
        { href: '/admin/users', label: 'Users', icon: Users },
        { href: '/admin/system', label: 'System Health', icon: Activity },
      ],
    },
  ];

  // Don't render collapsed state until mounted (prevents hydration mismatch)
  if (!mounted) {
    return <SidebarSkeleton />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-white/10',
          'bg-black/60 backdrop-blur-2xl text-white transition-[width] duration-300',
          'shadow-2xl shadow-black/50',
          'before:absolute before:inset-0 before:bg-noise before:opacity-[0.02] before:pointer-events-none',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            'flex items-center border-b border-white/10 p-4 bg-gradient-to-b from-white/5 to-transparent',
            collapsed ? 'justify-center' : 'gap-2'
          )}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-aqua-400 to-blue-600 shadow-lg shadow-aqua-500/25 hover:shadow-aqua-500/40 transition-shadow">
              <Bot className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 truncate animate-fade-in">
                Antigravity
              </span>
            )}
          </div>

          {/* Server Selector */}
          <div className={cn('border-b border-white/10', collapsed ? 'p-2' : 'p-3')}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors mx-auto">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Select Server
                </TooltipContent>
              </Tooltip>
            ) : (
              <ServerSelector />
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto custom-scrollbar py-2">
            {navSections.map((section) => {
              // Hide admin section if not admin
              if (section.adminOnly && !isAdmin) return null;

              return (
                <div key={section.title} className="mb-2">
                  {!collapsed && (
                    <h3 className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {section.title}
                    </h3>
                  )}
                  <div className={cn('space-y-0.5', collapsed ? 'px-1' : 'px-2')}>
                    {section.items.map((item) => (
                      <NavItemComponent
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        collapsed={collapsed}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Premium Section */}
          <div className={cn(
            'border-t border-white/10 bg-gradient-to-b from-black/30 to-black/10',
            collapsed ? 'p-2' : 'p-3'
          )}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 cursor-pointer hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-200 mx-auto shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20">
                    <Crown className="h-5 w-5 text-purple-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Upgrade to Premium
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-3 border border-purple-500/20 shadow-lg shadow-purple-500/5 hover:shadow-purple-500/10 transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">Upgrade to Premium</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Unlock advanced features and priority support.
                </p>
                <button className="w-full px-3 py-1.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40">
                  Upgrade Now
                </button>
              </div>
            )}
          </div>

          {/* User & Collapse Toggle */}
          <div className={cn(
            'border-t border-white/10 p-3 flex items-center',
            collapsed ? 'justify-center' : 'justify-between'
          )}>
            {!collapsed && (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">User</p>
                  <p className="text-xs text-muted-foreground truncate">Free Plan</p>
                </div>
              </div>
            )}
            <button
              onClick={toggleCollapsed}
              className={cn(
                'flex items-center justify-center rounded-lg transition-colors',
                'h-8 w-8 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════
// Nav Item Component
// ═══════════════════════════════════════════════

function NavItemComponent({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = item.icon;

  const content = (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center rounded-lg text-sm font-medium transition-all duration-200 will-change-transform',
        collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-2',
        isActive
          ? 'bg-aqua-500/10 text-aqua-400 shadow-[0_0_20px_rgba(20,184,166,0.2)] border border-aqua-500/20 hover:shadow-[0_0_25px_rgba(20,184,166,0.25)]'
          : 'text-gray-400 hover:bg-white/5 hover:text-white hover:scale-[1.02]'
      )}
    >
      <Icon className={cn(
        'h-5 w-5 shrink-0 transition-colors',
        isActive ? 'text-aqua-400' : 'text-gray-500 group-hover:text-gray-300'
      )} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

// ═══════════════════════════════════════════════
// Skeleton (for SSR)
// ═══════════════════════════════════════════════

function SidebarSkeleton() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="animate-pulse p-4 space-y-4">
        <div className="h-8 bg-white/10 rounded-lg" />
        <div className="h-10 bg-white/10 rounded-lg" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    </aside>
  );
}
