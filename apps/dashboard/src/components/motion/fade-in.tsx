'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';

interface FadeInProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate'> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ 
    children, 
    className, 
    delay = 0,
    duration = 0.4,
    direction = 'up',
    ...props 
  }, ref) => {
    const directionOffset = {
      up: { y: 20 },
      down: { y: -20 },
      left: { x: 20 },
      right: { x: -20 },
      none: {},
    };

    return (
      <motion.div
        ref={ref}
        className={className}
        initial={{ 
          opacity: 0, 
          ...directionOffset[direction] 
        }}
        animate={{ 
          opacity: 1, 
          x: 0, 
          y: 0 
        }}
        transition={{ 
          duration,
          delay,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

FadeIn.displayName = 'FadeIn';
