'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Settings page skeleton for loading state
 */
export function SettingsSkeleton() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bot Status Card */}
          <div className="surface-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="text-center p-3 rounded-lg bg-white/5">
                  <Skeleton className="h-5 w-5 mx-auto mb-2 rounded" />
                  <Skeleton className="h-7 w-12 mx-auto mb-1" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </div>

          {/* Notifications Card */}
          <div className="surface-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Links */}
          <div className="surface-card p-6">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          </div>

          {/* Version Info */}
          <div className="surface-card p-6">
            <Skeleton className="h-4 w-20 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-2 rounded-lg bg-white/5"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-14 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
