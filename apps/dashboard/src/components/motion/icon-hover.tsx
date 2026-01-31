'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface IconHoverProps {
  children: React.ReactNode;
  className?: string;
  scale?: number;
  rotate?: number;
}

export function IconHover({
  children,
  className,
  scale = 1.1,
  rotate = 0,
}: IconHoverProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={cn('inline-flex', className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn('inline-flex', className)}
      whileHover={{ scale, rotate }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  );
}
