'use client';

import { useState, Fragment } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, X, Sparkles, Zap, Shield, HelpCircle } from 'lucide-react';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { ReviewCarouselSection } from '@/components/reviews/review-carousel-section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Feature comparison data
const features = {
  moderation: {
    title: 'Moderation',
    items: [
      { name: 'Basic moderation (ban, kick, timeout)', free: true, premium: true },
      { name: 'Auto-moderation (spam, links)', free: true, premium: true },
      { name: 'Word filter', free: true, premium: true },
      { name: 'Advanced logging', free: false, premium: true },
      { name: 'Custom moderation actions', free: false, premium: true },
    ],
  },
  engagement: {
    title: 'Engagement',
    items: [
      { name: 'Leveling system', free: true, premium: true },
      { name: 'XP multipliers', free: false, premium: true },
      { name: 'Custom level-up messages', free: false, premium: true },
      { name: 'Voice XP', free: false, premium: true },
      { name: 'Leaderboard customization', free: false, premium: true },
    ],
  },
  automation: {
    title: 'Automation',
    items: [
      { name: 'Welcome messages', free: true, premium: true },
      { name: 'Auto-roles', free: true, premium: true },
      { name: 'Auto-responders (up to 5)', free: true, premium: false },
      { name: 'Unlimited auto-responders', free: false, premium: true },
      { name: 'Custom embed builder', free: false, premium: true },
    ],
  },
  tickets: {
    title: 'Tickets',
    items: [
      { name: 'Basic ticket system', free: false, premium: true },
      { name: 'Custom ticket forms', free: false, premium: true },
      { name: 'Ticket ratings', free: false, premium: true },
      { name: 'Staff analytics', free: false, premium: true },
      { name: 'Transcript archive', free: false, premium: true },
    ],
  },
  giveaways: {
    title: 'Giveaways',
    items: [
      { name: 'Basic giveaways', free: true, premium: true },
      { name: 'Multiple winners', free: true, premium: true },
      { name: 'Entry requirements', free: false, premium: true },
      { name: 'Bonus entries', free: false, premium: true },
      { name: 'Scheduled giveaways', free: false, premium: true },
    ],
  },
  dashboard: {
    title: 'Dashboard',
    items: [
      { name: 'Basic settings', free: true, premium: true },
      { name: 'Analytics dashboard', free: false, premium: true },
      { name: 'Audit logs', free: false, premium: true },
      { name: 'Settings export/import', free: false, premium: true },
      { name: 'Priority support', free: false, premium: true },
    ],
  },
};

// FAQ data
const faqs = [
  {
    question: 'Can I try Premium features before buying?',
    answer: 'We offer a 7-day free trial of Premium for new users. No credit card required to start.',
  },
  {
    question: 'What happens if I downgrade from Premium?',
    answer: 'Your settings are preserved, but Premium-only features will be disabled. You can upgrade again anytime to restore them.',
  },
  {
    question: 'Is Premium per server or per account?',
    answer: 'Premium is per server. Each server needs its own subscription. We offer discounts for multiple servers.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: "Yes! You can cancel your subscription at any time. You'll retain access until the end of your billing period.",
  },
  {
    question: 'Do you offer refunds?',
    answer: "We offer a 7-day money-back guarantee if you're not satisfied with Premium.",
  },
];

function FeatureCheck({ included }: { included: boolean }) {
  return included ? (
    <Check className="w-5 h-5 text-green-400" />
  ) : (
    <X className="w-5 h-5 text-gray-600" />
  );
}

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const price = billingPeriod === 'monthly' ? 4.99 : 49.99;
  const savings = billingPeriod === 'yearly' ? 'Save 17%' : null;

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
              Simple, Transparent Pricing
            </h1>
            <p className="mt-4 text-xl text-muted-foreground">
              Start free, upgrade when you need more power
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center gap-4 p-1 rounded-full bg-surface-1 border border-white/10">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-aqua-500 text-black'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                billingPeriod === 'yearly'
                  ? 'bg-aqua-500 text-black'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              Yearly
              {savings && (
                <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  {savings}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-5xl mx-auto px-4 mt-12">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="h-full bg-surface-1 border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-400" />
                    <CardTitle>Free</CardTitle>
                  </div>
                  <CardDescription>For small communities getting started</CardDescription>
                  <div className="mt-4">
                    <span className="text-5xl font-bold">$0</span>
                    <span className="text-muted-foreground">/forever</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>Basic moderation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>Welcome messages</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>Basic leveling</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>Up to 5 auto-responders</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>Basic giveaways</span>
                    </li>
                  </ul>
                  <Button className="w-full mt-6" variant="outline" asChild>
                    <Link href="/dashboard">Add to Server</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Premium Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="h-full bg-surface-1 border-aqua-500/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-aqua-500 to-blue-500" />
                <div className="absolute -top-3 right-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-aqua-500 to-blue-500 text-black text-xs font-semibold">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </span>
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-aqua-400" />
                    <CardTitle>Premium</CardTitle>
                  </div>
                  <CardDescription>For growing communities that need more</CardDescription>
                  <div className="mt-4">
                    <span className="text-5xl font-bold">${price}</span>
                    <span className="text-muted-foreground">
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>Everything in Free</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>Custom embed builder</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>Advanced ticket system</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>Unlimited auto-responders</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>Analytics dashboard</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                  <Button className="w-full mt-6 bg-gradient-to-r from-aqua-500 to-blue-500 hover:opacity-90">
                    Upgrade Now
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="max-w-5xl mx-auto px-4 mt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold">Compare Plans</h2>
            <p className="mt-2 text-muted-foreground">
              See what's included in each plan
            </p>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4">Feature</th>
                  <th className="text-center py-4 px-4 w-32">Free</th>
                  <th className="text-center py-4 px-4 w-32">Premium</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(features).map(([key, category]) => (
                  <Fragment key={key}>
                    <tr className="bg-surface-1/50">
                      <td colSpan={3} className="py-3 px-4 font-semibold">
                        {category.title}
                      </td>
                    </tr>
                    {category.items.map((item) => (
                      <tr key={item.name} className="border-b border-white/5">
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {item.name}
                        </td>
                        <td className="text-center py-3 px-4">
                          <FeatureCheck included={item.free} />
                        </td>
                        <td className="text-center py-3 px-4">
                          <FeatureCheck included={item.premium} />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reviews Section */}
        <ReviewCarouselSection />

        {/* FAQ */}
        <div className="max-w-3xl mx-auto px-4 mt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="p-6 rounded-xl bg-surface-1 border border-white/10"
              >
                <h3 className="flex items-center gap-2 font-semibold">
                  <HelpCircle className="w-5 h-5 text-aqua-400" />
                  {faq.question}
                </h3>
                <p className="mt-2 text-muted-foreground">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
