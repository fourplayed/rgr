import { useState, useCallback } from 'react';
import { SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/Input';

interface FloatingSearchProps {
  onSearch: (query: string) => void;
}

export function FloatingSearch({ onSearch }: FloatingSearchProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch(query);
    },
    [query, onSearch]
  );

  return (
    <form onSubmit={handleSubmit} className="w-80">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch(e.target.value);
          }}
          placeholder="Search assets..."
          className="pl-9 bg-card shadow-md shadow-black/15 focus-visible:ring-0 focus-visible:border-input dark:bg-card"
        />
      </div>
    </form>
  );
}
