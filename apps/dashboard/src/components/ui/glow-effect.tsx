'use client';

import * as React from 'react';
import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlowEffectProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  color?: 'aqua' | 'purple' | 'pink' | 'blue' | 'yellow' | 'green';
  intensity?: 'low' | 'medium' | 'high';
  pulse?: boolean;
  hover?: boolean;
}

const glowColors = {
  aqua: 'rgba(20, 184, 166, 0.3)',
  purple: 'rgba(168, 85, 247, 0.3)',
  pink: 'rgba(236, 72, 153, 0.3)',
  blue: 'rgba(59, 130, 246, 0.3)',
  yellow: 'rgba(234, 179, 8, 0.3)',
  green: 'rgba(34, 197, 94, 0.3)',
};

const intensityScale = {
  low: 20,
  medium: 30,
  high: 40,
};

/**
 * Glow Effect Component
 *
 * Reusable glow effect for cards, buttons, and other elements.
 * Optimized for 60fps performance.
 */
export const GlowEffect = React.forwardRef<HTMLDivElement, GlowEffectProps>(
  (
    {
      children,
      className,
      color = 'aqua',
      intensity = 'medium',
      pulse = false,
      hover = false,
      ...props
    },
    ref
  ) => {
    const glowSize = intensityScale[intensity];
    const glowColor = glowColors[color];

    const glowVariants: Variants = hover
      ? {
        rest: { opacity: 0, scale: 0.8 },
        hover: { opacity: 1, scale: 1.1 },
      }
      : pulse
        ? {
          pulse: {
            opacity: [0.5, 1, 0.5],
            scale: [0.95, 1.05, 0.95],
          },
        }
        : {
          static: { opacity: 1, scale: 1 },
        };

    const glowTransition = pulse
      ? { duration: 2, repeat: Infinity, ease: 'easeInOut' as const }
      : hover
        ? { duration: 0.3, ease: 'easeOut' as const }
        : {};

    return (
      <div ref={ref} className={cn('relative', className)} {...props}>
        {/* Glow layer */}
        <motion.div
          className="absolute inset-0 -z-10 pointer-events-none will-change-transform"
          initial={hover ? 'rest' : pulse ? undefined : 'static'}
          whileHover={hover ? 'hover' : undefined}
          animate={pulse ? 'pulse' : undefined}
          variants={glowVariants}
          transition={glowTransition}
          style={{
            filter: `blur(${glowSize}px)`,
            background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
          }}
        />

        {/* Content */}
        {children}
      </div>
    );
  }
);

GlowEffect.displayName = 'GlowEffect';
