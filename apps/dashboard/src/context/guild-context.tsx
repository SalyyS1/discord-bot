'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface GuildContextType {
  selectedGuildId: string | null;
  setSelectedGuildId: (id: string | null) => void;
  isInitialized: boolean;
}

const GuildContext = createContext<GuildContextType | null>(null);

const STORAGE_KEY = 'dashboard_selected_guild';

export function GuildProvider({ children }: { children: React.ReactNode }) {
  const [selectedGuildId, setSelectedGuildIdState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedGuildIdState(stored);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage on change
  const setSelectedGuildId = useCallback((id: string | null) => {
    setSelectedGuildIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <GuildContext.Provider value={{ selectedGuildId, setSelectedGuildId, isInitialized }}>
      {children}
    </GuildContext.Provider>
  );
}

export function useGuildContext() {
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error('useGuildContext must be used within GuildProvider');
  }
  return context;
}
