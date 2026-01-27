'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for a single autoresponder card
 * Matches the layout of the actual AutoResponder cards in the page
 */
export function AutoResponderCardSkeleton() {
  return (
    <div className="surface-card p-0 overflow-hidden">
      {/* Header with badges */}
      <div className="p-4 pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1 min-w-0">
            {/* Badge row */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            {/* Trigger text */}
            <Skeleton className="h-6 w-3/4" />
          </div>
          {/* Toggle switch */}
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>

      {/* Response preview */}
      <div className="px-4 pb-4">
        <div className="p-3 rounded-lg bg-[#0f1218] border border-white/5">
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Feature badges */}
        <div className="mt-3 flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        {/* Footer with cooldown and actions */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Grid skeleton for autoresponder list
 * Shows multiple card skeletons in a responsive grid
 */
export function AutoResponderListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <AutoResponderCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Stats cards skeleton for the autoresponder page header
 */
export function AutoResponderStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="surface-card p-4 flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
