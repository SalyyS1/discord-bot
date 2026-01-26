'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

interface PageTransitionProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit'> {
  children: React.ReactNode;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  ({ children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{ 
          duration: 0.3, 
          ease: [0.25, 0.1, 0.25, 1] // cubic-bezier for smooth feel
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

PageTransition.displayName = 'PageTransition';
