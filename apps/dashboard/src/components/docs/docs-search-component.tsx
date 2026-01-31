'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DocsSearchProps {
  onSearch: (query: string) => void;
}

export function DocsSearch({ onSearch }: DocsSearchProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        document.getElementById('docs-search')?.focus();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        id="docs-search"
        type="search"
        placeholder="Search documentation... (Cmd+K)"
        value={query}
        onChange={handleChange}
        className="pl-10 bg-black/40 border-white/10 text-white placeholder:text-gray-500"
      />
    </div>
  );
}
