import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from '@/components/ui/glass-card';
import { Book, Shield, Ticket, Gift, TrendingUp, Mic, Hand, FileText } from 'lucide-react';

const guides = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of setting up SylaBot',
    icon: Book,
    href: '/document/wiki/getting-started',
    color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
  },
  {
    title: 'Moderation',
    description: 'Auto-moderation and security features',
    icon: Shield,
    href: '/document/wiki/moderation',
    color: 'from-red-500/20 to-red-600/10 border-red-500/30',
  },
  {
    title: 'Tickets',
    description: 'Support ticket system management',
    icon: Ticket,
    href: '/document/wiki/tickets',
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  },
  {
    title: 'Giveaways',
    description: 'Create and manage server giveaways',
    icon: Gift,
    href: '/document/wiki/giveaways',
    color: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
  },
  {
    title: 'Leveling',
    description: 'XP and leveling system configuration',
    icon: TrendingUp,
    href: '/document/wiki/leveling',
    color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  },
  {
    title: 'Temp Voice',
    description: 'Join-to-create voice channels',
    icon: Mic,
    href: '/document/wiki/tempvoice',
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  },
  {
    title: 'Welcome Messages',
    description: 'Customize welcome and goodbye messages',
    icon: Hand,
    href: '/document/wiki/welcome',
    color: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
  },
];

export default function DocumentationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Documentation</h1>
        <p className="text-gray-400 text-lg">
          Everything you need to know about using SylaBot
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => {
          const Icon = guide.icon;
          return (
            <Link key={guide.href} href={guide.href}>
              <GlassCard
                variant="hover"
                className={`h-full bg-gradient-to-br ${guide.color}`}
              >
                <GlassCardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-white/10">
                      <Icon className="h-5 w-5" />
                    </div>
                    <GlassCardTitle>{guide.title}</GlassCardTitle>
                  </div>
                  <GlassCardDescription>{guide.description}</GlassCardDescription>
                </GlassCardHeader>
              </GlassCard>
            </Link>
          );
        })}
      </div>

      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Need Help?
          </GlassCardTitle>
          <GlassCardDescription>
            Can't find what you're looking for? Visit our support server or contact us on Discord.
          </GlassCardDescription>
        </GlassCardHeader>
      </GlassCard>
    </div>
  );
}
