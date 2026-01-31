'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Shield,
  Ticket,
  Gift,
  Menu,
  X,
  Settings,
  Bell,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ═══════════════════════════════════════════════
// Main Nav Items (Visible in bottom bar)
// ═══════════════════════════════════════════════

const mainItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/moderation', label: 'Mod', icon: Shield },
  { href: '/dashboard/tickets', label: 'Tickets', icon: Ticket },
  { href: '/dashboard/giveaway', label: 'Giveaway', icon: Gift },
];

// ═══════════════════════════════════════════════
// More Items (In sheet menu)
// ═══════════════════════════════════════════════

const moreItems: NavItem[] = [
  { href: '/dashboard/welcome', label: 'Welcome & Goodbye', icon: Bell },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/leveling', label: 'Leveling', icon: Zap },
  { href: '/dashboard/autoresponder', label: 'Autoresponder', icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black/80 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
      <div className="flex justify-around py-2 px-2">
        {mainItems.map((item) => (
          <MobileNavItem
            key={item.href}
            item={item}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}

        {/* More menu trigger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-0.5 py-1 px-3 text-gray-400">
              <Menu className="h-5 w-5" />
              <span className="text-[10px]">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[50vh] bg-black/95 border-t border-white/10 rounded-t-3xl">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <div className="grid grid-cols-3 gap-4 px-4">
                {moreItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl transition-colors',
                      pathname === item.href || pathname.startsWith(item.href + '/')
                        ? 'bg-aqua-500/10 text-aqua-400'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="text-xs font-medium text-center">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════
// Nav Item Component
// ═══════════════════════════════════════════════

function MobileNavItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors',
        active
          ? 'text-aqua-400'
          : 'text-gray-400 hover:text-white'
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px]">{item.label}</span>
    </Link>
  );
}
