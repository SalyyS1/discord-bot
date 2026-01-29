'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/glass-card';
import { DocsSearch } from '@/components/docs/docs-search-component';
import { Book, Shield, Ticket, Gift, TrendingUp, Mic, Hand } from 'lucide-react';

const wikiPages = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of setting up and configuring SylaBot for your Discord server',
    icon: Book,
    category: 'Basics',
  },
  {
    slug: 'moderation',
    title: 'Moderation',
    description: 'Configure auto-moderation features including anti-spam and anti-link protection',
    icon: Shield,
    category: 'Features',
  },
  {
    slug: 'tickets',
    title: 'Tickets',
    description: 'Set up and manage support ticket system for your server members',
    icon: Ticket,
    category: 'Features',
  },
  {
    slug: 'giveaways',
    title: 'Giveaways',
    description: 'Create and manage engaging giveaways to reward your community',
    icon: Gift,
    category: 'Features',
  },
  {
    slug: 'leveling',
    title: 'Leveling',
    description: 'Configure XP system and level roles to encourage member engagement',
    icon: TrendingUp,
    category: 'Features',
  },
  {
    slug: 'tempvoice',
    title: 'Temp Voice',
    description: 'Enable join-to-create temporary voice channels for your members',
    icon: Mic,
    category: 'Features',
  },
  {
    slug: 'welcome',
    title: 'Welcome Messages',
    description: 'Customize welcome and goodbye messages with images and variables',
    icon: Hand,
    category: 'Basics',
  },
];

export default function WikiIndexPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPages = wikiPages.filter(
    (page) =>
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Wiki</h1>
        <p className="text-gray-400 text-lg">
          Browse comprehensive guides for all SylaBot features
        </p>
      </div>

      <DocsSearch onSearch={setSearchQuery} />

      <div className="grid gap-4 md:grid-cols-2">
        {filteredPages.map((page) => {
          const Icon = page.icon;
          return (
            <Link key={page.slug} href={`/document/wiki/${page.slug}`}>
              <GlassCard variant="hover" className="h-full">
                <GlassCardHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <GlassCardTitle>{page.title}</GlassCardTitle>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                          {page.category}
                        </span>
                      </div>
                      <GlassCardDescription>{page.description}</GlassCardDescription>
                    </div>
                  </div>
                </GlassCardHeader>
              </GlassCard>
            </Link>
          );
        })}
      </div>

      {filteredPages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No results found for "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
