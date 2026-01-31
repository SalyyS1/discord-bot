'use client';

import { useSidebar } from '@/context/sidebar-context';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className={cn(
      "transition-all duration-300 ease-in-out",
      isCollapsed ? "ml-16" : "ml-64"
    )}>
      {children}
    </div>
  );
}
