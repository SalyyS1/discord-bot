'use client';

import { useLoadingContext } from '@/context/loading-context';
import { Loader2 } from 'lucide-react';

export function LoadingOverlay() {
    const { isGuildSwitching, isGlobalLoading, loadingMessage } = useLoadingContext();

    if (!isGuildSwitching && !isGlobalLoading) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200">
            <div className="flex flex-col items-center gap-3 rounded-xl bg-black/80 p-6 shadow-2xl">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                <span className="text-sm font-medium text-white/90">
                    {loadingMessage || 'Loading...'}
                </span>
            </div>
        </div>
    );
}
