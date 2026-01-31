'use client';

import { useEffect } from 'react';

interface UseUnsavedChangesOptions<T> {
    initialValue: T;
    currentValue: T;
    enabled?: boolean;
}

/**
 * Hook to detect unsaved changes and warn user before leaving
 */
export function useUnsavedChanges<T>({
    initialValue,
    currentValue,
    enabled = true
}: UseUnsavedChangesOptions<T>) {
    const isDirty = enabled && JSON.stringify(initialValue) !== JSON.stringify(currentValue);

    // Block browser close/refresh when dirty
    useEffect(() => {
        if (!isDirty) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
            return '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    return { isDirty };
}
