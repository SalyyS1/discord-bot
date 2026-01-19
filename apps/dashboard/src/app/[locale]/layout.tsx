import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Discord Bot Dashboard',
  description: 'Manage your Discord bot settings',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster position="bottom-right" richColors />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
