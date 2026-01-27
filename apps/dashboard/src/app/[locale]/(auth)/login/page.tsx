'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Bot, Loader2, Shield, Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signIn } from '@/lib/auth-client';
import { LanguageSwitcher } from '@/components/language-switcher';

// Discord logo SVG
function DiscordLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function LoginPage() {
  const t = useTranslations('login');
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('/dashboard');

  useEffect(() => {
    // Get callback URL from query params
    const callback = searchParams.get('callbackUrl');
    if (callback) {
      setCallbackUrl(callback);
    }
  }, [searchParams]);

  const handleDiscordLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await signIn.social({
        provider: 'discord',
        callbackURL: callbackUrl,
      });
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to connect to Discord. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-black">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 rounded-full blur-[100px] animate-pulse" />
        </div>
        <div className="absolute top-20 left-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]" />
      </div>

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Home</span>
        </Link>
        <LanguageSwitcher />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-3xl blur-xl opacity-20" />

          <div className="relative bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                    <Bot className="h-7 w-7 text-white" />
                  </div>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  SylaBot
                </span>
              </Link>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">
                {t('title')}
              </h1>
              <p className="text-gray-400">
                Sign in with your Discord account to manage your servers
              </p>
            </div>

            {/* Discord Login Button */}
            <Button
              onClick={handleDiscordLogin}
              disabled={loading}
              className="w-full h-14 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-semibold text-base transition-all duration-300 group shadow-lg shadow-indigo-500/25"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <DiscordLogo className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />
              )}
              {loading ? 'Connecting...' : 'Continue with Discord'}
            </Button>

            {error && (
              <p className="mt-4 text-sm text-red-400 text-center">{error}</p>
            )}

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-900 px-4 text-xs text-gray-500 uppercase tracking-wider">
                  Why Discord?
                </span>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Secure Authentication</p>
                  <p className="text-xs text-gray-500">No passwords to remember - Discord handles it all</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Instant Access</p>
                  <p className="text-xs text-gray-500">Automatically see all servers you can manage</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-gray-600">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="text-cyan-400 hover:underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
