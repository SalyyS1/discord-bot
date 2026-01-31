'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function Breadcrumb() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  
  const segments = pathname.split('/').filter(Boolean);
  
  // Remove locale segment (en, vi, etc.)
  const pathSegments = segments.filter(s => !['en', 'vi'].includes(s));
  
  // Route label mapping - uses translations where available
  const getLabel = (segment: string): string => {
    const labels: Record<string, string> = {
      'dashboard': t('overview'),
      'moderation': t('moderation'),
      'welcome': t('welcome'),
      'messages': t('messages'),
      'leveling': t('leveling'),
      'giveaway': t('giveaway'),
      'tickets': t('tickets'),
      'autoresponder': t('autoresponder'),
      'settings': t('settings'),
      'analytics': 'Analytics',
      'audit': 'Audit Log',
    };
    return labels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  };
  
  // Don't show breadcrumb on root dashboard page
  if (pathSegments.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link 
        href="/dashboard" 
        className="flex items-center justify-center h-7 w-7 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {pathSegments.map((segment, i) => {
        const isLast = i === pathSegments.length - 1;
        const href = '/' + pathSegments.slice(0, i + 1).join('/');
        
        return (
          <div key={segment} className="flex items-center gap-1.5">
            <ChevronRight className="h-4 w-4 text-gray-600" />
            {isLast ? (
              <span className="text-white font-medium px-2 py-1">
                {getLabel(segment)}
              </span>
            ) : (
              <Link 
                href={href}
                className="text-gray-400 hover:text-white px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
              >
                {getLabel(segment)}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
