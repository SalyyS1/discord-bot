import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassCardVariants = cva(
  'rounded-xl backdrop-blur-xl transition-all duration-300 will-change-transform relative overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-black/40 border border-white/10',
        hover:
          'bg-black/40 border border-white/10 hover:border-white/20 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]',
        active:
          'bg-black/50 border border-aqua-500/30 shadow-[0_0_20px_rgba(20,184,166,0.2)]',
        solid: 'bg-card border border-border',
        noise: 'bg-black/40 border border-white/10 before:absolute before:inset-0 before:bg-noise before:opacity-[0.015] before:pointer-events-none',
      },
      glow: {
        none: '',
        aqua: 'shadow-[0_0_25px_rgba(20,184,166,0.25)] hover:shadow-[0_0_35px_rgba(20,184,166,0.35)]',
        purple: 'shadow-[0_0_25px_rgba(168,85,247,0.25)] hover:shadow-[0_0_35px_rgba(168,85,247,0.35)]',
        pink: 'shadow-[0_0_25px_rgba(236,72,153,0.25)] hover:shadow-[0_0_35px_rgba(236,72,153,0.35)]',
        blue: 'shadow-[0_0_25px_rgba(59,130,246,0.25)] hover:shadow-[0_0_35px_rgba(59,130,246,0.35)]',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      depth: {
        flat: '',
        raised: 'shadow-2xl',
        floating: 'shadow-2xl hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      glow: 'none',
      padding: 'md',
      depth: 'flat',
    },
  }
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  asChild?: boolean;
  shimmer?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, glow, padding, depth, shimmer = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(glassCardVariants({ variant, glow, padding, depth }), className)}
      {...props}
    >
      {shimmer && (
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent bg-[length:200%_100%]" />
        </div>
      )}
      {children}
    </div>
  )
);
GlassCard.displayName = 'GlassCard';

const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 mb-4', className)}
    {...props}
  />
));
GlassCardHeader.displayName = 'GlassCardHeader';

const GlassCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-semibold text-white leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
GlassCardTitle.displayName = 'GlassCardTitle';

const GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
GlassCardDescription.displayName = 'GlassCardDescription';

const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
GlassCardContent.displayName = 'GlassCardContent';

const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center mt-4 pt-4 border-t border-white/10', className)}
    {...props}
  />
));
GlassCardFooter.displayName = 'GlassCardFooter';

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
  glassCardVariants,
};
