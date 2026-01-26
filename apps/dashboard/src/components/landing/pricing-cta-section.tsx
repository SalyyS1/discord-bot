'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, Check, X, Zap, Crown, Shield, Gift, Users, MessageSquare, BarChart3, Ticket, Bot, Clock, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const plans = [
  {
    name: 'Free',
    description: 'Perfect for small communities',
    price: 0,
    period: 'forever',
    badge: null,
    gradient: 'from-gray-500/20 to-slate-500/20',
    borderColor: 'border-white/10 hover:border-white/20',
    buttonGradient: 'from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600',
    buttonText: 'Get Started Free',
    features: [
      { name: 'Auto Moderation', included: true, detail: 'Basic spam & raid protection' },
      { name: 'Leveling System', included: true, detail: 'Text & voice XP' },
      { name: 'Giveaways', included: true, detail: 'Up to 3 active giveaways' },
      { name: 'Ticket System', included: true, detail: '1 panel, basic forms' },
      { name: 'Welcome Messages', included: true, detail: 'Text only' },
      { name: 'Auto Responder', included: true, detail: 'Up to 10 triggers' },
      { name: 'Analytics', included: true, detail: '7-day history' },
      { name: 'Unlimited Panels', included: false },
      { name: 'XP Multipliers', included: false },
      { name: 'Priority Support', included: false },
    ],
  },
  {
    name: 'Premium',
    description: 'For growing communities',
    price: 1,
    period: '/month',
    badge: 'Most Popular',
    gradient: 'from-cyan-500/20 via-blue-500/20 to-purple-500/20',
    borderColor: 'border-cyan-500/30 hover:border-cyan-500/50',
    buttonGradient: 'from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400',
    buttonText: 'Upgrade to Premium',
    features: [
      { name: 'Auto Moderation', included: true, detail: 'Advanced protection' },
      { name: 'Leveling System', included: true, detail: 'Unlimited + multipliers' },
      { name: 'Giveaways', included: true, detail: 'Unlimited giveaways' },
      { name: 'Ticket System', included: true, detail: 'Unlimited panels & forms' },
      { name: 'Welcome Messages', included: true, detail: 'Rich embeds + images' },
      { name: 'Auto Responder', included: true, detail: 'Unlimited triggers' },
      { name: 'Analytics', included: true, detail: '90-day history' },
      { name: 'Unlimited Panels', included: true, detail: 'Tickets & giveaways' },
      { name: 'XP Multipliers', included: true, detail: 'Role-based' },
      { name: 'Priority Support', included: true, detail: '< 2 hour response' },
    ],
  },
  {
    name: 'Pro',
    description: 'For large communities',
    price: 3,
    period: '/month',
    badge: 'Best Value',
    gradient: 'from-amber-500/20 via-orange-500/20 to-red-500/20',
    borderColor: 'border-amber-500/30 hover:border-amber-500/50',
    buttonGradient: 'from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400',
    buttonText: 'Upgrade to Pro',
    features: [
      { name: 'Everything in Premium', included: true, detail: 'All Premium features' },
      { name: 'Advanced Analytics', included: true, detail: '365-day history' },
      { name: 'Custom Branding', included: true, detail: 'Your logo & colors' },
      { name: 'Webhook Integration', included: true, detail: 'External integrations' },
      { name: 'Backup & Restore', included: true, detail: 'Config backup' },
      { name: 'Multi-server', included: true, detail: 'Use on 3 servers' },
      { name: 'Custom Commands', included: true, detail: 'Create custom commands' },
      { name: 'API Access', included: true, detail: 'Full REST API' },
      { name: 'Dedicated Support', included: true, detail: '24/7 priority support' },
      { name: 'Early Access', included: true, detail: 'New features first' },
    ],
  },
];

const featureIcons: Record<string, typeof Shield> = {
  'Auto Moderation': Shield,
  'Leveling System': Zap,
  'Giveaways': Gift,
  'Ticket System': Ticket,
  'Welcome Messages': Users,
  'Auto Responder': MessageSquare,
  'Analytics': BarChart3,
  'Advanced Analytics': BarChart3,
  'Unlimited Panels': Ticket,
  'XP Multipliers': Zap,
  'Priority Support': HeartHandshake,
  'Everything in Premium': Crown,
  'Custom Branding': Crown,
  'Webhook Integration': Bot,
  'Backup & Restore': Shield,
  'Multi-server': Users,
  'Custom Commands': Bot,
  'API Access': Bot,
  'Dedicated Support': HeartHandshake,
  'Early Access': Sparkles,
};

export function PricingCTASection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const getPrice = (basePrice: number) => {
    if (basePrice === 0) return 'Free';
    const price = billingCycle === 'yearly' ? basePrice * 10 : basePrice; // 10 months = 2 free
    return `$${price}`;
  };

  const getPeriod = (basePrice: number, period: string) => {
    if (basePrice === 0) return period;
    return billingCycle === 'yearly' ? '/year' : period;
  };

  return (
    <section id="pricing" className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900/50 to-black" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-[150px] animate-pulse" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 mb-6 hover:scale-105 transition-transform cursor-default">
            <Crown className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-white">Choose your</span>{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              perfect plan
            </span>
          </h2>
          
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            Start free and upgrade as you grow. No hidden fees, cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 rounded-2xl bg-white/5 border border-white/10">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative hover:scale-105 active:scale-95 ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold animate-pulse">
                -17%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative group ${plan.name === 'Premium' ? 'lg:-mt-4 lg:mb-4' : ''}`}
            >
              {/* Gradient border effect */}
              <div className={`absolute -inset-[1px] rounded-3xl bg-gradient-to-r ${plan.gradient} opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500`} />
              
              <div className={`relative p-8 rounded-3xl bg-slate-900/90 backdrop-blur-xl border ${plan.borderColor} transition-all duration-500 h-full flex flex-col group-hover:translate-y-[-4px] ${
                plan.name === 'Premium' ? 'ring-2 ring-cyan-500/20' : ''
              }`}>
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                      plan.name === 'Premium' 
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25' 
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                    }`}>
                      {plan.badge}
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mb-6">{plan.description}</p>
                  
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">
                      {getPrice(plan.price)}
                    </span>
                    <span className="text-gray-500">{getPeriod(plan.price, plan.period)}</span>
                  </div>
                  
                  {billingCycle === 'yearly' && plan.price > 0 && (
                    <p className="text-sm text-emerald-400 mt-2 flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Save 2 months!
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  size="lg"
                  className={`w-full h-14 bg-gradient-to-r ${plan.buttonGradient} text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group/btn mb-8`}
                  asChild
                >
                  <Link href={plan.name === 'Free' 
                    ? `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1462790510883110965'}&scope=bot%20applications.commands&permissions=8`
                    : '/dashboard'
                  }>
                    {plan.name === 'Free' ? (
                      <Sparkles className="mr-2 w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                    ) : plan.name === 'Premium' ? (
                      <Zap className="mr-2 w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                    ) : (
                      <Crown className="mr-2 w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                    )}
                    {plan.buttonText}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </Button>

                {/* Features List */}
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">What&apos;s included</p>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => {
                      const IconComponent = featureIcons[feature.name] || Check;
                      return (
                        <li 
                          key={feature.name}
                          className={`flex items-start gap-3 p-2 rounded-lg transition-all duration-200 ${
                            feature.included 
                              ? 'hover:bg-white/5 cursor-default' 
                              : 'opacity-40'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                            feature.included 
                              ? plan.name === 'Free' 
                                ? 'bg-gray-500/20 text-gray-400' 
                                : plan.name === 'Premium'
                                  ? 'bg-cyan-500/20 text-cyan-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              : 'bg-gray-800 text-gray-600'
                          }`}>
                            {feature.included ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                          </div>
                          <div className="flex-1">
                            <span className={`text-sm ${feature.included ? 'text-gray-300' : 'text-gray-600 line-through'}`}>
                              {feature.name}
                            </span>
                            {feature.included && feature.detail && (
                              <p className="text-xs text-gray-500 mt-0.5">{feature.detail}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Trust Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-8 px-8 py-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 text-gray-400 hover:text-white hover:scale-105 transition-all cursor-default">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-sm">Secure payments</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 hover:text-white hover:scale-105 transition-all cursor-default">
              <Clock className="w-5 h-5 text-cyan-400" />
              <span className="text-sm">Cancel anytime</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 hover:text-white hover:scale-105 transition-all cursor-default">
              <HeartHandshake className="w-5 h-5 text-pink-400" />
              <span className="text-sm">24/7 support</span>
            </div>
          </div>
          
          <p className="mt-8 text-gray-500">
            Questions?{' '}
            <Link 
              href="https://discord.gg/your-server" 
              className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline transition-all"
              target="_blank"
            >
              Join our Discord
            </Link>
            {' '}for help
          </p>
        </motion.div>
      </div>
    </section>
  );
}
