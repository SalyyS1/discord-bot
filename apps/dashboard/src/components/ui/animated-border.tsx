'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradient?: string;
  borderWidth?: number;
  borderRadius?: string;
  animationSpeed?: number;
}

/**
 * Animated Border Component
 *
 * Creates a gradient border animation around content.
 * Optimized for 60fps using CSS transforms.
 */
export const AnimatedBorder = React.forwardRef<HTMLDivElement, AnimatedBorderProps>(
  (
    {
      children,
      className,
      gradient = 'from-cyan-500 via-blue-500 to-purple-500',
      borderWidth = 2,
      borderRadius = '1rem',
      animationSpeed = 3,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('relative', className)}
        style={{ borderRadius, padding: borderWidth }}
        {...props}
      >
        {/* Animated gradient border */}
        <motion.div
          className={cn(
            'absolute inset-0 bg-gradient-to-r',
            gradient,
            'opacity-75'
          )}
          style={{ borderRadius }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: animationSpeed,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Static gradient overlay for smoother appearance */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-r opacity-25',
            gradient
          )}
          style={{ borderRadius }}
        />

        {/* Content container */}
        <div
          className="relative bg-black/90 backdrop-blur-xl"
          style={{ borderRadius }}
        >
          {children}
        </div>
      </div>
    );
  }
);

AnimatedBorder.displayName = 'AnimatedBorder';
