'use client';

import Link from 'next/link';
import { useSession, signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Bot, Menu, X, Sparkles, ChevronDown, Crown, Zap, LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#testimonials', label: 'Reviews' },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDiscordLogin = async () => {
    setIsLoading(true);
    try {
      await signIn.social({
        provider: 'discord',
        callbackURL: '/dashboard',
      });
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-3'
        }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${scrolled
            ? 'bg-black/80 backdrop-blur-xl border-b border-white/[0.08] shadow-lg shadow-black/20'
            : 'bg-transparent'
          }`}
      />

      <div className="container mx-auto px-4 relative">
        <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'
          }`}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur-lg opacity-0 group-hover:opacity-60 transition-all duration-300" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg group-hover:shadow-cyan-500/30 group-hover:scale-105 transition-all duration-300">
                <Bot className="h-6 w-6 text-white group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-cyan-400 group-hover:to-blue-400 transition-all duration-300">
              SylaBot
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-sm font-medium text-gray-400 hover:text-white rounded-xl transition-all duration-200 group"
              >
                <span className="relative z-10">{link.label}</span>
                <div className="absolute inset-0 bg-white/0 hover:bg-white/5 rounded-xl transition-all duration-200" />
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 group-hover:w-8 transition-all duration-300 rounded-full" />
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <Link href="/dashboard">
                <Button className="h-10 px-5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all duration-200 group">
                  <Zap className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="h-10 px-4 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl hover:scale-105 active:scale-95 transition-all duration-200 group"
                  onClick={handleDiscordLogin}
                  disabled={isLoading}
                >
                  <LogIn className="mr-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  {isLoading ? 'Connecting...' : 'Login'}
                </Button>
                <Link href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1462790510883110965'}&scope=bot%20applications.commands&permissions=8`} target="_blank">
                  <Button className="h-10 px-5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all duration-200 group">
                    <Sparkles className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                    Add to Server
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 active:scale-95 transition-all duration-200"
            onClick={() => setIsOpen(!isOpen)}
          >
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.div>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/10 overflow-hidden"
          >
            <div className="p-4 space-y-2">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={link.href}
                    className="block px-4 py-3 text-sm font-medium text-gray-400 hover:text-white rounded-xl hover:bg-white/5 active:bg-white/10 transition-all duration-200"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pt-4 space-y-2 border-t border-white/10"
              >
                {!session && (
                  <Button
                    className="w-full h-12 hover:bg-white/5 active:bg-white/10 transition-all"
                    variant="ghost"
                    onClick={handleDiscordLogin}
                    disabled={isLoading}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    {isLoading ? 'Connecting...' : 'Login with Discord'}
                  </Button>
                )}
                <Link href={session ? '/dashboard' : `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1462790510883110965'}&scope=bot%20applications.commands&permissions=8`} className="block">
                  <Button className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl font-semibold active:scale-[0.98] transition-all duration-200">
                    {session ? (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Open Dashboard
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Add to Server
                      </>
                    )}
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
