'use client';

import { useTranslations } from 'next-intl';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LanguageSwitcher } from '@/components/language-switcher';
import { signOut, useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export function Header() {
  const t = useTranslations('common');
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        <h1 className="text-lg font-semibold">{t('dashboard')}</h1>
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />

        {session?.user && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image || ''} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{session.user.name || session.user.email}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
