'use client';

/**
 * Full Page Skeleton - Replaces entire page content while loading
 * Uses shimmer animation for better perceived performance
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header with gradient shimmer effect */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
            <div className="h-4 w-32 rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
          </div>
        </div>
        <div className="h-10 w-48 rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
      </div>

      {/* Full Content Area Skeleton */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-64 rounded-xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
          <div className="h-48 rounded-xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
        </div>
        <div className="space-y-6">
          <div className="h-32 rounded-xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
          <div className="h-48 rounded-xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

/**
 * Card Skeleton - For individual card loading states
 */
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl bg-black/40 border border-white/10 p-6 ${className}`}>
      <div className="space-y-4">
        <div className="h-5 w-32 rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
        <div className="h-4 w-full rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
        <div className="h-4 w-3/4 rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
      </div>
    </div>
  );
}

/**
 * Table Row Skeleton - For table/list loading states
 */
export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-white/5">
      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
        <div className="h-3 w-32 rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
      </div>
      <div className="h-6 w-16 rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
    </div>
  );
}
