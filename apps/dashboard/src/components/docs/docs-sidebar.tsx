'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Book, Shield, Ticket, Gift, TrendingUp, Mic, Hand } from 'lucide-react';

const docsNav = [
  {
    title: 'Getting Started',
    href: '/document/wiki/getting-started',
    icon: Book,
  },
  {
    title: 'Moderation',
    href: '/document/wiki/moderation',
    icon: Shield,
  },
  {
    title: 'Tickets',
    href: '/document/wiki/tickets',
    icon: Ticket,
  },
  {
    title: 'Giveaways',
    href: '/document/wiki/giveaways',
    icon: Gift,
  },
  {
    title: 'Leveling',
    href: '/document/wiki/leveling',
    icon: TrendingUp,
  },
  {
    title: 'Temp Voice',
    href: '/document/wiki/tempvoice',
    icon: Mic,
  },
  {
    title: 'Welcome Messages',
    href: '/document/wiki/welcome',
    icon: Hand,
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-8 space-y-2">
      <h2 className="text-lg font-semibold text-white mb-4">Documentation</h2>
      {docsNav.map((item) => {
        const Icon = item.icon;
        const isActive = pathname?.includes(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200',
              isActive
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
