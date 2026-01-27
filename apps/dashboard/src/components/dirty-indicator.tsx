'use client';

import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface DirtyIndicatorProps {
    isDirty: boolean;
    className?: string;
}

/**
 * Visual indicator showing unsaved changes exist
 */
export function DirtyIndicator({ isDirty, className }: DirtyIndicatorProps) {
    if (!isDirty) return null;

    return (
        <Badge
            variant="outline"
            className={`border-yellow-500/50 bg-yellow-500/10 text-yellow-500 ${className}`}
        >
            <AlertCircle className="mr-1 h-3 w-3" />
            Unsaved
        </Badge>
    );
}
