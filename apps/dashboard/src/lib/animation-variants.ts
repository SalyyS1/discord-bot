/**
 * Shared Framer Motion Animation Variants
 *
 * Optimized for 60fps - uses transform and opacity only
 * Respects prefers-reduced-motion
 */

// ═══════════════════════════════════════════════
// Spring Configs
// ═══════════════════════════════════════════════

export const springConfigs = {
  gentle: { type: 'spring' as const, stiffness: 100, damping: 20 },
  bouncy: { type: 'spring' as const, stiffness: 300, damping: 15 },
  stiff: { type: 'spring' as const, stiffness: 400, damping: 25 },
};

// ═══════════════════════════════════════════════
// Basic Variants
// ═══════════════════════════════════════════════

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export const slideUp = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.98 },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const scale = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

// ═══════════════════════════════════════════════
// Hover Effects
// ═══════════════════════════════════════════════

export const lift = {
  rest: { y: 0, scale: 1 },
  hover: { y: -4, scale: 1.02, transition: { duration: 0.2, ease: 'easeOut' } },
  tap: { scale: 0.98, transition: { duration: 0.1 } },
};

export const glow = {
  rest: { opacity: 0, scale: 1 },
  hover: { opacity: 1, scale: 1.1, transition: { duration: 0.3 } },
};

export const buttonPress = {
  rest: { scale: 1 },
  hover: { scale: 1.05, transition: springConfigs.gentle },
  tap: { scale: 0.95, transition: { duration: 0.1 } },
};

// ═══════════════════════════════════════════════
// Stagger Variants
// ═══════════════════════════════════════════════

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const staggerFast = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0,
    },
  },
};

// ═══════════════════════════════════════════════
// Glass Card Variants
// ═══════════════════════════════════════════════

export const glassCard = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springConfigs.gentle,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: { duration: 0.2 },
  },
  hover: {
    y: -2,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
};

// ═══════════════════════════════════════════════
// Page Transition
// ═══════════════════════════════════════════════

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1], // cubic-bezier
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

// ═══════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════

/**
 * Respects prefers-reduced-motion
 */
export const withReducedMotion = (variants: any) => {
  if (typeof window === 'undefined') return variants;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return {
      ...variants,
      animate: { ...variants.animate, transition: { duration: 0.01 } },
      exit: { ...variants.exit, transition: { duration: 0.01 } },
    };
  }

  return variants;
};

/**
 * Create stagger delay
 */
export const staggerDelay = (index: number, baseDelay = 0.1) => ({
  transition: { delay: index * baseDelay },
});
