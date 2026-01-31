'use client';

import { motion } from 'framer-motion';
import { Calendar, Plus, Wrench, Sparkles, Bug, AlertTriangle } from 'lucide-react';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

// Changelog entries - in production, fetch from API or MDX
const changelog = [
  {
    version: '2.5.0',
    date: '2026-01-25',
    title: 'Rating & Feedback System',
    type: 'feature',
    changes: [
      { type: 'added', text: 'Staff attribution in ticket ratings' },
      { type: 'added', text: 'Testimonial management with approve/feature functionality' },
      { type: 'added', text: 'Rating analytics dashboard with staff performance' },
      { type: 'added', text: 'Public testimonials API for website integration' },
      { type: 'improved', text: 'Rating prompts now use customizable MessageBuilder templates' },
      { type: 'improved', text: 'Review channel publishing with color-coded embeds' },
    ],
  },
  {
    version: '2.4.0',
    date: '2026-01-24',
    title: 'Advanced Ticket System',
    type: 'feature',
    changes: [
      { type: 'added', text: 'Anti-abuse controls (max tickets, cooldowns, anti-raid)' },
      { type: 'added', text: 'Custom ticket forms with multiple fields' },
      { type: 'improved', text: 'Ticket messages now use MessageBuilder engine' },
      { type: 'improved', text: 'Staff claiming and assignment workflow' },
    ],
  },
  {
    version: '2.3.0',
    date: '2026-01-23',
    title: 'Dashboard UI Redesign',
    type: 'feature',
    changes: [
      { type: 'added', text: 'New design token system with brand colors' },
      { type: 'added', text: 'Collapsible sidebar with persistent state' },
      { type: 'added', text: 'Global search with Cmd/Ctrl + K shortcut' },
      { type: 'added', text: 'Mobile bottom navigation' },
      { type: 'improved', text: 'Channel selector with search and grouping' },
    ],
  },
  {
    version: '2.2.0',
    date: '2026-01-22',
    title: 'Premium & Billing',
    type: 'feature',
    changes: [
      { type: 'added', text: 'Stripe integration for subscriptions' },
      { type: 'added', text: 'Centralized feature gating with Redis cache' },
      { type: 'added', text: 'Customer portal for subscription management' },
      { type: 'added', text: 'Webhook idempotency for reliable payment processing' },
    ],
  },
  {
    version: '2.1.0',
    date: '2026-01-21',
    title: 'Message Builder Engine',
    type: 'feature',
    changes: [
      { type: 'added', text: 'MessageConfig format for rich message customization' },
      { type: 'added', text: 'Template lifecycle management (draft, publish, archive)' },
      { type: 'added', text: 'Template version history with rollback' },
      { type: 'added', text: 'Message compiler with Discord API limit enforcement' },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-01-20',
    title: 'Foundation & Infrastructure',
    type: 'major',
    changes: [
      { type: 'added', text: 'Global settings system with Zod validation' },
      { type: 'added', text: 'Redis pub/sub for real-time config sync' },
      { type: 'added', text: 'Settings export/import functionality' },
      { type: 'added', text: 'Enhanced audit logging with full context' },
      { type: 'improved', text: 'OAuth token refresh with mutex locks' },
      { type: 'improved', text: 'Health check endpoints (public and internal)' },
    ],
  },
];

function getTypeIcon(type: string) {
  switch (type) {
    case 'added':
      return <Plus className="w-4 h-4 text-green-400" />;
    case 'improved':
      return <Sparkles className="w-4 h-4 text-blue-400" />;
    case 'fixed':
      return <Wrench className="w-4 h-4 text-yellow-400" />;
    case 'removed':
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    default:
      return <Bug className="w-4 h-4 text-gray-400" />;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'feature':
      return { label: 'Feature', color: 'bg-green-500/20 text-green-400' };
    case 'major':
      return { label: 'Major', color: 'bg-purple-500/20 text-purple-400' };
    case 'fix':
      return { label: 'Bug Fix', color: 'bg-yellow-500/20 text-yellow-400' };
    case 'security':
      return { label: 'Security', color: 'bg-red-500/20 text-red-400' };
    default:
      return { label: 'Update', color: 'bg-blue-500/20 text-blue-400' };
  }
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="pt-24 pb-16">
        {/* Header */}
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold">Changelog</h1>
            <p className="mt-4 text-xl text-muted-foreground">
              All notable changes to the bot and dashboard
            </p>
          </motion.div>
        </div>

        {/* Timeline */}
        <div className="max-w-3xl mx-auto px-4 mt-16">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-0 bottom-0 w-[2px] bg-white/10" />

            <div className="space-y-12">
              {changelog.map((release, index) => {
                const typeInfo = getTypeLabel(release.type);
                
                return (
                  <motion.article
                    key={release.version}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="relative pl-10"
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-0 w-6 h-6 rounded-full bg-aqua-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-black" />
                    </div>

                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-lg font-mono font-bold">v{release.version}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(release.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <h2 className="text-2xl font-bold mt-2">{release.title}</h2>

                    {/* Changes list */}
                    <ul className="mt-4 space-y-2">
                      {release.changes.map((change, changeIndex) => (
                        <li
                          key={changeIndex}
                          className="flex items-start gap-2 text-muted-foreground"
                        >
                          {getTypeIcon(change.type)}
                          <span>{change.text}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
