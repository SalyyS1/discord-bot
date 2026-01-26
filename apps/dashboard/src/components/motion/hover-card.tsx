'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface HoverCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
  hoverY?: number;
  tapScale?: number;
}

export const HoverCard = forwardRef<HTMLDivElement, HoverCardProps>(
  ({ 
    children, 
    className, 
    hoverScale = 1.02,
    hoverY = -4,
    tapScale = 0.98,
    ...props 
  }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn('cursor-pointer', className)}
        whileHover={{ 
          y: hoverY, 
          scale: hoverScale,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)' 
        }}
        whileTap={{ scale: tapScale }}
        transition={{ 
          type: 'spring', 
          stiffness: 400, 
          damping: 25 
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

HoverCard.displayName = 'HoverCard';
