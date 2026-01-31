'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import { PageTransition } from '@/components/motion';

interface AnimatedContentProps {
  children: React.ReactNode;
}

/**
 * Wraps page content with smooth page transitions
 * Respects prefers-reduced-motion preference
 */
export function AnimatedContent({ children }: AnimatedContentProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition key={pathname}>{children}</PageTransition>
    </AnimatePresence>
  );
}
