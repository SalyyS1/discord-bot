'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Users, Server, MessageSquare, Sparkles, ArrowUpRight, Zap, Clock, Shield, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CounterProps {
  value: number;
  suffix?: string;
  duration?: number;
}

function Counter({ value, suffix = '', duration = 2 }: CounterProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    if (latest >= 1000000) return `${(latest / 1000000).toFixed(1)}M`;
    if (latest >= 1000) return `${(latest / 1000).toFixed(latest >= 10000 ? 0 : 1)}K`;
    return Math.round(latest).toString();
  });
  const [displayValue, setDisplayValue] = useState('0');
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v));
    return unsubscribe;
  }, [rounded]);

  useEffect(() => {
    // Reset animation when value changes
    hasAnimated.current = false;
    count.set(0);
  }, [value, count]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animate(count, value, { duration, ease: 'easeOut' });
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [count, value, duration]);

  return (
    <span ref={ref}>
      {displayValue}
      {suffix}
    </span>
  );
}

interface StatsData {
  servers: number;
  users: number;
  messages: number;
  uptime: number;
  responseTime: number;
}

export function StatsSection() {
  const [stats, setStats] = useState<StatsData>({
    servers: 0,
    users: 0,
    messages: 0,
    uptime: 99.9,
    responseTime: 50,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const statsConfig = [
    {
      icon: Server,
      value: stats.servers,
      suffix: '',
      label: 'Active Servers',
      description: 'Communities using KisBot',
      gradient: 'from-cyan-500 to-blue-500',
      bgGlow: 'bg-cyan-500/20',
    },
    {
      icon: Users,
      value: stats.users,
      suffix: '',
      label: 'Total Users',
      description: 'Discord members served',
      gradient: 'from-purple-500 to-pink-500',
      bgGlow: 'bg-purple-500/20',
    },
    {
      icon: MessageSquare,
      value: stats.messages,
      suffix: '',
      label: 'Messages',
      description: 'Processed total',
      gradient: 'from-orange-500 to-red-500',
      bgGlow: 'bg-orange-500/20',
    },
    {
      icon: Sparkles,
      value: stats.uptime,
      suffix: '%',
      label: 'Uptime',
      description: 'Reliable 24/7 service',
      gradient: 'from-green-500 to-emerald-500',
      bgGlow: 'bg-green-500/20',
    },
  ];

  const additionalStats = [
    { icon: Zap, label: `<${stats.responseTime}ms`, description: 'Response time' },
    { icon: Clock, label: '24/7', description: 'Monitoring' },
    { icon: Shield, label: '100%', description: 'Data secure' },
  ];

  return (
    <section id="analytics" className="relative py-28">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900/30 to-black" />
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-1/2 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[150px]"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[150px]"
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
            {loading ? (
              <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
            ) : (
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            )}
            <span className="text-xs text-cyan-400 font-medium">Live Stats</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-white">Trusted by</span>{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              growing communities
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Join the Discord servers that rely on KisBot for their daily operations.
          </p>
        </motion.div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
          {statsConfig.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative"
            >
              <div className="relative p-6 md:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all duration-300 overflow-hidden hover:shadow-2xl">
                {/* Hover gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500`} />
                
                {/* Background glow */}
                <div className={`absolute -bottom-4 -right-4 w-24 h-24 ${stat.bgGlow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Value */}
                <div className="text-4xl md:text-5xl font-bold text-white mb-1 flex items-baseline gap-1">
                  {loading ? (
                    <span className="text-gray-500">--</span>
                  ) : (
                    <Counter value={stat.value} suffix={stat.suffix} />
                  )}
                  {!loading && stat.value > 0 && (
                    <ArrowUpRight className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                  )}
                </div>
                
                {/* Label */}
                <div className="text-lg font-medium text-white/80 mb-1">{stat.label}</div>
                
                {/* Description */}
                <div className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">{stat.description}</div>
                
                {/* Bottom line accent */}
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${stat.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-8 md:gap-16 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]"
        >
          {additionalStats.map((stat) => (
            <div 
              key={stat.description}
              className="flex items-center gap-3 group cursor-default"
            >
              <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                <stat.icon className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <div className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">{stat.label}</div>
                <div className="text-xs text-gray-500">{stat.description}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
