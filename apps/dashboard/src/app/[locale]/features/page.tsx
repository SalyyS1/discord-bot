'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Shield,
  Trophy,
  Ticket,
  Gift,
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Shield,
    title: 'Moderation',
    description: 'Keep your server safe with powerful moderation tools',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    features: [
      'Ban, kick, and timeout members',
      'Auto-moderation for spam and raids',
      'Customizable word filter',
      'Link and mention spam protection',
      'Detailed moderation logs',
      'Warning system with auto-actions',
    ],
  },
  {
    icon: Trophy,
    title: 'Leveling System',
    description: 'Engage your community with a rewarding leveling system',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    features: [
      'XP for messages and voice chat',
      'Custom level-up messages',
      'Role rewards at milestones',
      'Server and global leaderboards',
      'XP multipliers for roles',
      'No-XP channels and roles',
    ],
  },
  {
    icon: Ticket,
    title: 'Ticket System',
    description: 'Professional support system for your community',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    features: [
      'Customizable ticket panels',
      'Custom forms for ticket creation',
      'Staff assignment and claiming',
      'Ticket ratings and analytics',
      'Transcript saving',
      'Multiple ticket categories',
    ],
    premium: true,
  },
  {
    icon: Gift,
    title: 'Giveaways',
    description: 'Run exciting giveaways with advanced features',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    features: [
      'One-click giveaway creation',
      'Multiple winners support',
      'Entry requirements (level, roles)',
      'Bonus entries for engagement',
      'Scheduled giveaways',
      'Winner reroll and DM notification',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Auto-Responder',
    description: 'Automate responses to common questions',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    features: [
      'Keyword-triggered responses',
      'Multiple trigger types',
      'Rich embed responses',
      'Cooldowns to prevent spam',
      'Channel-specific responses',
      'Regex pattern matching',
    ],
  },
  {
    icon: Users,
    title: 'Welcome System',
    description: 'Make new members feel at home',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    features: [
      'Custom welcome messages',
      'Welcome images',
      'Auto-role assignment',
      'DM welcome messages',
      'Member verification',
      'Goodbye messages',
    ],
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Understand your community with detailed insights',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    features: [
      'Member growth tracking',
      'Message activity stats',
      'Ticket performance metrics',
      'Staff leaderboards',
      'Engagement trends',
      'Exportable reports',
    ],
    premium: true,
  },
  {
    icon: Settings,
    title: 'Dashboard',
    description: 'Manage everything from a beautiful dashboard',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    features: [
      'Modern, intuitive interface',
      'Real-time configuration sync',
      'Audit logging',
      'Settings backup & restore',
      'Multi-server management',
      'Role-based access control',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="pt-24 pb-16">
        {/* Header */}
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold">
              Powerful Features for Every Community
            </h1>
            <p className="mt-4 text-xl text-muted-foreground">
              Everything you need to build, manage, and grow your Discord server
            </p>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto px-4 mt-16">
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full bg-surface-1 border-white/10 hover:border-white/20 transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${feature.bgColor}`}>
                        <feature.icon className={`w-6 h-6 ${feature.color}`} />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {feature.title}
                          {feature.premium && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-aqua-500/20 text-aqua-400">
                              Premium
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.features.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className={`w-1.5 h-1.5 rounded-full ${feature.color.replace('text-', 'bg-')}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-4xl mx-auto px-4 mt-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
            <p className="mt-4 text-muted-foreground">
              Add the bot to your server and start exploring these features today
            </p>
            <div className="mt-8 flex gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  Add to Server
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
