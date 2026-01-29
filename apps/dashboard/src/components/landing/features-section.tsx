'use client';

import { motion } from 'framer-motion';
import { Ticket, Gift, Zap, Shield, MessageSquare, BarChart3, Bot, Sparkles, Crown, Check, ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const features = [
  {
    icon: Shield,
    title: 'Smart Moderation',
    description: 'AI-powered auto-mod catches spam, raids, and bad actors before they cause damage. Keep your community safe 24/7.',
    gradient: 'from-blue-500 to-cyan-500',
    glow: 'group-hover:shadow-blue-500/20',
    bgGlow: 'bg-blue-500/10',
    free: true,
    highlights: ['Anti-spam protection', 'Raid detection', 'Word filters', 'Auto-warn system'],
  },
  {
    icon: Zap,
    title: 'Leveling & XP',
    description: 'Gamify your server with voice & text XP, custom level roles, and beautiful rank cards. Watch engagement soar.',
    gradient: 'from-yellow-500 to-orange-500',
    glow: 'group-hover:shadow-yellow-500/20',
    bgGlow: 'bg-yellow-500/10',
    free: true,
    highlights: ['Text & voice XP', 'Custom rank cards', 'Level roles', 'Leaderboards'],
  },
  {
    icon: Ticket,
    title: 'Advanced Tickets',
    description: 'Multi-panel ticket system with forms, ratings, and transcripts. Track staff performance with built-in analytics.',
    gradient: 'from-purple-500 to-pink-500',
    glow: 'group-hover:shadow-purple-500/20',
    bgGlow: 'bg-purple-500/10',
    free: true,
    highlights: ['Custom forms', 'Staff ratings', 'Transcripts', 'Role pings'],
  },
  {
    icon: Gift,
    title: 'Viral Giveaways',
    description: 'Grow your server with requirement-based giveaways. Require roles, levels, or invites to enter.',
    gradient: 'from-pink-500 to-rose-500',
    glow: 'group-hover:shadow-pink-500/20',
    bgGlow: 'bg-pink-500/10',
    free: true,
    highlights: ['Entry requirements', 'Multiple winners', 'Auto-reroll', 'Scheduled starts'],
  },
  {
    icon: MessageSquare,
    title: 'Auto Responder',
    description: 'Create custom triggers with regex support. Auto-reply to FAQs, welcome new members, and more.',
    gradient: 'from-green-500 to-emerald-500',
    glow: 'group-hover:shadow-green-500/20',
    bgGlow: 'bg-green-500/10',
    free: true,
    highlights: ['Regex triggers', 'Embed responses', 'Cooldowns', 'Channel filters'],
  },
  {
    icon: BarChart3,
    title: 'Deep Analytics',
    description: 'Track growth, engagement, and moderation stats. Beautiful charts and exportable reports.',
    gradient: 'from-cyan-500 to-blue-500',
    glow: 'group-hover:shadow-cyan-500/20',
    bgGlow: 'bg-cyan-500/10',
    free: false,
    highlights: ['Growth charts', 'Activity heatmaps', 'Staff reports', 'Export data'],
  },
];

export function FeaturesSection() {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  return (
    <section id="features" className="relative py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900/50 to-black" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6 hover:bg-cyan-500/15 hover:border-cyan-500/30 transition-all duration-300 cursor-default">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">Powerful Features</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-white">Everything you need to</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              build thriving communities
            </span>
          </h2>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            From moderation to engagement, SylaBot has all the tools you need in one powerful package.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              onMouseEnter={() => setActiveFeature(index)}
              onMouseLeave={() => setActiveFeature(null)}
              className={`group relative p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all duration-500 ${feature.glow} hover:shadow-2xl cursor-default will-change-transform`}
            >
              {/* Hover gradient overlay */}
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500`} />

              {/* Free/Premium badge */}
              <div className="absolute top-6 right-6">
                {feature.free ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    Free
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold inline-flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Premium
                  </span>
                )}
              </div>

              {/* Icon */}
              <div className={`relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-2xl will-change-transform`}>
                <feature.icon className="w-7 h-7 text-white" />
                {/* Icon glow */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 group-hover:bg-clip-text transition-all duration-300">
                {feature.title}
              </h3>

              <p className="text-gray-400 leading-relaxed mb-6">
                {feature.description}
              </p>

              {/* Highlights */}
              <div className="grid grid-cols-2 gap-2">
                {feature.highlights.map((highlight, i) => (
                  <div
                    key={highlight}
                    className={`flex items-center gap-2 text-sm text-gray-500 group-hover:text-gray-400 transition-colors duration-300`}
                    style={{ transitionDelay: `${i * 50}ms` }}
                  >
                    <Check className={`w-3.5 h-3.5 flex-shrink-0`} style={{ color: `var(--${feature.gradient.split('-')[1]}-400, #22d3ee)` }} />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>

              {/* Bottom accent line */}
              <div className={`absolute bottom-0 left-8 right-8 h-[3px] bg-gradient-to-r ${feature.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-full origin-left shadow-lg`} />

              {/* Corner decoration */}
              <div className={`absolute -bottom-2 -right-2 w-20 h-20 ${feature.bgGlow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 text-center"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-6 p-8 rounded-3xl bg-gradient-to-r from-white/[0.02] to-white/[0.05] border border-white/10 hover:border-white/20 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                <Bot className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-white text-lg">And much more...</p>
                <p className="text-sm text-gray-400">Temp voice, welcome messages, logging, and 50+ commands</p>
              </div>
            </div>

            <div className="h-px w-full sm:h-12 sm:w-px bg-white/10" />

            <Link href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1462790510883110965'}&scope=bot%20applications.commands&permissions=8`} target="_blank">
              <Button className="h-12 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-semibold hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 group will-change-transform">
                <Sparkles className="mr-2 w-4 h-4 group-hover:rotate-12 transition-transform" />
                Try Free Now
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
