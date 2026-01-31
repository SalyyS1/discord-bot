'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════
// Simple Tooltip (no external deps)
// ═══════════════════════════════════════════════

interface TooltipProviderProps {
    children: React.ReactNode;
    delayDuration?: number;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
    return <>{children}</>;
}

interface TooltipProps {
    children: React.ReactNode;
}

export function Tooltip({ children }: TooltipProps) {
    return <div className="relative inline-block">{children}</div>;
}

interface TooltipTriggerProps {
    children: React.ReactNode;
    asChild?: boolean;
}

export const TooltipTrigger = React.forwardRef<
    HTMLDivElement,
    TooltipTriggerProps
>(({ children, asChild }, ref) => {
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<{ ref?: React.Ref<HTMLDivElement> }>, { ref });
    }
    return <div ref={ref} className="peer">{children}</div>;
});
TooltipTrigger.displayName = 'TooltipTrigger';

interface TooltipContentProps {
    children: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    className?: string;
}

export function TooltipContent({
    children,
    side = 'top',
    className
}: TooltipContentProps) {
    const sideStyles = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    };

    return (
        <div
            className={cn(
                'absolute z-50 hidden peer-hover:block',
                'px-3 py-1.5 text-sm text-white',
                'bg-[hsl(200_22%_16%)] border border-white/10 rounded-md shadow-lg',
                'whitespace-nowrap',
                sideStyles[side],
                className
            )}
        >
            {children}
        </div>
    );
}
