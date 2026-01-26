'use client';

import { Search } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useSession } from '@/lib/auth-client';
import { Breadcrumb } from '@/components/breadcrumb';
import { UserDropdown } from '@/components/user-dropdown';

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[hsl(200_20%_22%)] bg-[hsl(200_25%_14%/0.95)] backdrop-blur-sm px-6">
      {/* Left: Breadcrumb */}
      <Breadcrumb />

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Command palette trigger */}
        <button 
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-[hsl(200_22%_18%)] border border-[hsl(200_20%_25%)] rounded-lg hover:bg-[hsl(200_20%_22%)] hover:text-white transition-colors"
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
            document.dispatchEvent(event);
          }}
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline ml-2 px-1.5 py-0.5 text-xs bg-[hsl(200_25%_12%)] border border-[hsl(200_20%_22%)] rounded font-mono">
            ⌘K
          </kbd>
        </button>
        
        <LanguageSwitcher />
        
        {session?.user && (
          <UserDropdown user={session.user} />
        )}
      </div>
    </header>
  );
}
