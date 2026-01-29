/**
 * Profile Layout
 * Provides tab navigation for profile sections
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  const tabs = [
    { label: 'Overview', href: '/profile' },
    { label: 'Settings', href: '/profile/settings' },
    { label: 'Sessions', href: '/profile/sessions' },
    { label: 'Data & Privacy', href: '/profile/data' },
  ];

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="border-b">
        <nav className="flex space-x-6">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="border-b-2 border-transparent px-1 pb-4 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
