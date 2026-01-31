'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  speed?: number;
  direction?: 'horizontal' | 'vertical';
}

/**
 * Shimmer Effect Component
 *
 * Loading shimmer overlay for skeleton states.
 * Optimized with CSS animations for 60fps performance.
 */
export const Shimmer = React.forwardRef<HTMLDivElement, ShimmerProps>(
  ({ className, speed = 2, direction = 'horizontal', ...props }, ref) => {
    const gradientDirection = direction === 'horizontal' ? '90deg' : '180deg';

    return (
      <div
        ref={ref}
        className={cn(
          'absolute inset-0 overflow-hidden pointer-events-none',
          className
        )}
        {...props}
      >
        <div
          className="absolute inset-0 animate-shimmer"
          style={{
            background: `linear-gradient(
              ${gradientDirection},
              transparent 0%,
              rgba(255, 255, 255, 0.05) 25%,
              rgba(255, 255, 255, 0.1) 50%,
              rgba(255, 255, 255, 0.05) 75%,
              transparent 100%
            )`,
            backgroundSize: direction === 'horizontal' ? '200% 100%' : '100% 200%',
            animationDuration: `${speed}s`,
          }}
        />
      </div>
    );
  }
);

Shimmer.displayName = 'Shimmer';
