'use client';

import * as React from 'react';
import { motion, useMotionValue, useSpring, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MagneticButtonProps extends Omit<HTMLMotionProps<'button'>, 'onMouseMove' | 'onMouseLeave'> {
  children: React.ReactNode;
  strength?: number;
}

/**
 * Magnetic Button Component
 *
 * Button with magnetic hover effect that follows the cursor.
 * Optimized for 60fps with spring animations.
 */
export const MagneticButton = React.forwardRef<HTMLButtonElement, MagneticButtonProps>(
  ({ children, className, strength = 20, ...props }, ref) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { damping: 20, stiffness: 300 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (typeof window === 'undefined') return;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;

      // Apply strength factor
      x.set(distanceX * (strength / 100));
      y.set(distanceY * (strength / 100));
    };

    const handleMouseLeave = () => {
      x.set(0);
      y.set(0);
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center will-change-transform',
          className
        )}
        style={{ x: springX, y: springY }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileTap={{ scale: 0.95 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

MagneticButton.displayName = 'MagneticButton';
