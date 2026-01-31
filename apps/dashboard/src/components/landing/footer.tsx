'use client';

import Link from 'next/link';
import { Bot, Github, Twitter, MessageCircle, Heart, ExternalLink, Mail, ArrowUpRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Commands', href: '/commands' },
  ],
  resources: [
    { label: 'Documentation', href: '/docs' },
    { label: 'Support Server', href: 'https://discord.gg/your-server', external: true },
    { label: 'Status Page', href: '/status' },
    { label: 'Changelog', href: '/changelog' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'Refund Policy', href: '/refund' },
  ],
};

const socialLinks = [
  { icon: MessageCircle, href: 'https://discord.gg/your-server', label: 'Discord', color: 'hover:text-indigo-400 hover:bg-indigo-500/10' },
  { icon: Twitter, href: 'https://twitter.com/sylabot', label: 'Twitter', color: 'hover:text-sky-400 hover:bg-sky-500/10' },
  { icon: Github, href: 'https://github.com/salyvn', label: 'GitHub', color: 'hover:text-white hover:bg-white/10' },
  { icon: Mail, href: 'mailto:support@sylabot.io', label: 'Email', color: 'hover:text-emerald-400 hover:bg-emerald-500/10' },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.05] bg-black overflow-hidden">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-t from-cyan-500/5 to-transparent blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 py-16 relative">
        {/* CTA Section */}
        <div className="mb-16 p-8 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to level up your Discord server?
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Join 10,000+ communities using SylaBot to engage members and streamline moderation.
          </p>
          <Link href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1462790510883110965'}&scope=bot%20applications.commands&permissions=8`} target="_blank">
            <Button className="h-12 px-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-semibold hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 group">
              <Sparkles className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
              Add to Discord — It&apos;s Free
              <ArrowUpRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 group mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur-lg opacity-0 group-hover:opacity-50 transition-all duration-300" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 group-hover:scale-110 transition-transform duration-300">
                  <Bot className="h-6 w-6 text-white group-hover:rotate-12 transition-transform duration-300" />
                </div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-cyan-400 group-hover:to-blue-400 transition-all duration-300">
                SylaBot
              </span>
            </Link>

            <p className="text-gray-500 leading-relaxed max-w-sm mb-6">
              The ultimate Discord bot for moderation, engagement, and community management.
              Trusted by 10,000+ servers worldwide.
            </p>

            {/* Social Links */}
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2.5 rounded-xl bg-white/5 text-gray-500 ${social.color} transition-all duration-300 hover:scale-110 active:scale-95`}
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-white transition-all duration-200 inline-flex items-center gap-1 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-500 hover:text-white transition-all duration-200 inline-flex items-center gap-1 group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform duration-200">{link.label}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-white transition-all duration-200 inline-flex items-center gap-1 group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform duration-200">{link.label}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-white transition-all duration-200 inline-flex items-center gap-1 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-200">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-16 pt-8 border-t border-white/[0.05]">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} SylaBot. All rights reserved.
            </p>
            <p className="text-sm text-gray-600 flex items-center gap-1 group cursor-default">
              Made with{' '}
              <Heart className="w-4 h-4 text-red-500 fill-red-500 group-hover:scale-125 group-hover:animate-pulse transition-transform" />{' '}
              for Discord communities
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
