'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoadingContextType {
    isGuildSwitching: boolean;
    isGlobalLoading: boolean;
    loadingMessage: string | null;
    startGuildSwitch: () => void;
    endGuildSwitch: () => void;
    showLoading: (message?: string) => void;
    hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
    const [isGuildSwitching, setIsGuildSwitching] = useState(false);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

    const startGuildSwitch = useCallback(() => {
        setIsGuildSwitching(true);
        setLoadingMessage('Switching server...');
    }, []);

    const endGuildSwitch = useCallback(() => {
        // Small delay for smooth transition
        setTimeout(() => {
            setIsGuildSwitching(false);
            setLoadingMessage(null);
        }, 300);
    }, []);

    const showLoading = useCallback((message?: string) => {
        setIsGlobalLoading(true);
        setLoadingMessage(message || 'Loading...');
    }, []);

    const hideLoading = useCallback(() => {
        setIsGlobalLoading(false);
        setLoadingMessage(null);
    }, []);

    return (
        <LoadingContext.Provider
            value={{
                isGuildSwitching,
                isGlobalLoading,
                loadingMessage,
                startGuildSwitch,
                endGuildSwitch,
                showLoading,
                hideLoading,
            }}
        >
            {children}
        </LoadingContext.Provider>
    );
}

export function useLoadingContext() {
    const context = useContext(LoadingContext);
    if (context === undefined) {
        throw new Error('useLoadingContext must be used within a LoadingProvider');
    }
    return context;
}
