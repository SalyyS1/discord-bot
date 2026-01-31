'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { getCsrfToken } from '@/lib/csrf-utils';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = async () => {
    const newLocale = locale === 'vi' ? 'en' : 'vi';

    // Set cookie for persistence across pages
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // If user is logged in, sync to their profile
    try {
      const csrfToken = getCsrfToken();

      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'x-csrf-token': csrfToken }),
        },
        body: JSON.stringify({ locale: newLocale }),
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('Failed to sync locale to user profile (user may not be logged in)');
      }
    } catch (error) {
      console.warn('Failed to sync locale preference:', error);
    }

    // Navigate to the new locale
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      className="flex items-center gap-2"
    >
      <Languages className="h-4 w-4" />
      <span className="uppercase">{locale}</span>
    </Button>
  );
}
