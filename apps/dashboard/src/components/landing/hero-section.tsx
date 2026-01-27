'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Play, Star, Users, Shield, Zap, Crown, Gift, Check, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

const floatingIcons = [
  { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/20', delay: 0, x: -140, y: -80 },
  { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/20', delay: 0.2, x: 150, y: -60 },
  { icon: Star, color: 'text-pink-400', bg: 'bg-pink-500/20', delay: 0.4, x: -120, y: 100 },
  { icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/20', delay: 0.6, x: 130, y: 80 },
  { icon: Gift, color: 'text-emerald-400', bg: 'bg-emerald-500/20', delay: 0.8, x: -160, y: 10 },
];

const quickFeatures = [
  { icon: Shield, label: 'Auto Moderation', free: true },
  { icon: Zap, label: 'Leveling System', free: true },
  { icon: Gift, label: 'Giveaways', free: true },
  { icon: Crown, label: 'Premium Features', free: false },
];

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const [stats, setStats] = useState({ servers: 0, users: 0, rating: 5.0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          setStats({
            servers: data.data.servers,
            users: data.data.users,
            rating: data.data.rating || 5.0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Main gradient orb */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px]"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 via-blue-500/20 to-purple-500/30 rounded-full blur-[120px]" />
        </motion.div>

        {/* Secondary orbs */}
        <motion.div
          className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/20 rounded-full blur-[80px]"
          animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]"
          animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 right-1/4 w-64 h-64 bg-pink-500/15 rounded-full blur-[80px]"
          animate={{ y: [0, 40, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]" />

        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.9)_100%)]" />
      </div>

      <motion.div style={{ y, opacity }} className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Floating icons around hero */}
          <div className="absolute inset-0 pointer-events-none hidden lg:block">
            {floatingIcons.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: item.delay + 0.5, duration: 0.5, type: 'spring' }}
                className="absolute top-1/2 left-1/2"
                style={{ transform: `translate(${item.x}px, ${item.y}px)` }}
              >
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: item.delay, ease: 'easeInOut' }}
                  className={`p-3.5 rounded-2xl ${item.bg} backdrop-blur-sm border border-white/10 shadow-lg hover:scale-110 transition-transform duration-300 cursor-pointer`}
                >
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Free Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="#pricing" className="group inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-emerald-500/20 backdrop-blur-sm mb-8 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-sm animate-pulse" />
                  <div className="relative w-2 h-2 bg-emerald-400 rounded-full" />
                </div>
                <span className="text-sm font-semibold text-emerald-400">100% Free to Start</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <span className="text-sm text-gray-400 group-hover:text-white transition-colors">No credit card required</span>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </Link>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8"
          >
            <span className="text-white">Build Amazing</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x">
              Discord Communities
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Powerful moderation, engaging leveling system, viral giveaways, and smart ticket management
            — all in one beautifully designed bot. <span className="text-cyan-400 font-medium">Free forever.</span>
          </motion.p>

          {/* Quick Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-10"
          >
            {quickFeatures.map((feature, i) => (
              <div
                key={feature.label}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${feature.free
                    ? 'bg-white/5 border border-white/10 text-gray-300'
                    : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-400'
                  } hover:scale-105 transition-transform duration-200 cursor-default`}
              >
                <feature.icon className={`w-4 h-4 ${feature.free ? 'text-cyan-400' : 'text-amber-400'}`} />
                <span className="text-sm font-medium">{feature.label}</span>
                {feature.free && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                {!feature.free && <Crown className="w-3.5 h-3.5" />}
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1462790510883110965'}&scope=bot%20applications.commands&permissions=8`} target="_blank">
              <Button
                size="lg"
                className="h-14 px-8 text-base font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.3)] hover:shadow-[0_0_60px_rgba(6,182,212,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 group"
              >
                <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Add to Discord — Free
                <Sparkles className="ml-2 h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base font-semibold border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 text-white rounded-2xl backdrop-blur-sm hover:scale-105 active:scale-95 transition-all duration-300 group"
              >
                Open Dashboard
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-8 text-gray-500"
          >
            <div className="flex items-center gap-2 hover:scale-105 transition-transform cursor-default">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-black flex items-center justify-center text-xs font-bold text-white shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][i - 1]}40, ${['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][i - 1]}20)`
                    }}
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="text-sm">
                {loading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                  </span>
                ) : (
                  `${stats.servers} server${stats.servers !== 1 ? 's' : ''} using SylaBot`
                )}
              </span>
            </div>
            <div className="flex items-center gap-1 hover:scale-105 transition-transform cursor-default group">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400 group-hover:animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
              <span className="ml-2 text-sm">{stats.rating}/5 rating</span>
            </div>
            <div className="flex items-center gap-2 hover:scale-105 transition-transform cursor-default">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm">99.9% Uptime</span>
            </div>
          </motion.div>
        </div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-24 relative max-w-5xl mx-auto"
        >
          {/* Glow effect behind preview */}
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 via-transparent to-transparent blur-3xl -z-10" />
          <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl -z-10" />

          <div className="relative rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-2 shadow-2xl hover:border-white/20 transition-all duration-500 group">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-pointer" />
              </div>
              <div className="flex-1 mx-4">
                <div className="h-6 bg-white/5 rounded-lg max-w-md mx-auto flex items-center px-3 hover:bg-white/10 transition-colors">
                  <span className="text-xs text-gray-500">sylabot.io/dashboard</span>
                </div>
              </div>
            </div>

            {/* Dashboard mockup content */}
            <div className="aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-b-xl overflow-hidden">
              <div className="p-6 h-full flex gap-4">
                {/* Sidebar mockup */}
                <div className="w-48 bg-slate-800/50 rounded-xl p-4 space-y-3 hidden sm:block">
                  <div className="h-8 bg-cyan-500/20 rounded-lg animate-pulse" />
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-8 rounded-lg transition-all duration-300 ${i === 1 ? 'bg-cyan-500/30' : 'bg-white/5 hover:bg-white/10'
                          }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Main content mockup */}
                <div className="flex-1 space-y-4">
                  {/* Stats cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['Members', 'Messages', 'Tickets', 'Giveaways'].map((label, i) => (
                      <div
                        key={label}
                        className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800/70 transition-colors duration-300 group/card"
                      >
                        <div className="h-3 w-16 bg-white/10 rounded mb-2" />
                        <div className={`h-6 w-20 rounded group-hover/card:scale-105 transition-transform ${['bg-cyan-500/30', 'bg-blue-500/30', 'bg-purple-500/30', 'bg-pink-500/30'][i]
                          }`} />
                      </div>
                    ))}
                  </div>

                  {/* Chart placeholder */}
                  <div className="bg-slate-800/50 rounded-xl p-4 flex-1 min-h-[200px] hover:bg-slate-800/70 transition-colors duration-300">
                    <div className="h-3 w-32 bg-white/10 rounded mb-4" />
                    <div className="flex items-end gap-2 h-32">
                      {[40, 60, 45, 80, 55, 90, 70, 85, 95, 75, 88, 92].map((h, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-cyan-500/50 to-cyan-500/20 rounded-t hover:from-cyan-500/70 hover:to-cyan-500/40 transition-colors duration-300"
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ delay: 0.6 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating badges around preview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute -left-4 top-1/3 hidden xl:block"
          >
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm hover:scale-105 transition-transform">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Real-time sync</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="absolute -right-4 top-1/2 hidden xl:block"
          >
            <div className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 backdrop-blur-sm hover:scale-105 transition-transform">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-400">Lightning fast</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
