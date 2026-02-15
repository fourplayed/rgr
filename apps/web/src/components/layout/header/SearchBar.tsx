import { useState, useCallback, FormEvent } from 'react';
import { Search } from 'lucide-react';
import { SearchBarProps } from './types';

/**
 * Search input component with icon
 */
export function SearchBar({
  placeholder = 'Search assets, maintenance tasks...',
  onSearch,
  value: controlledValue,
  onChange,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState('');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (isControlled) {
      onChange?.(newValue);
    } else {
      setInternalValue(newValue);
    }
  }, [isControlled, onChange]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
  }, [onSearch, value]);

  return (
    <form onSubmit={handleSubmit} className="relative w-96">
      <label htmlFor="header-search" className="sr-only">
        Search
      </label>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"
        aria-hidden="true"
      />
      <input
        id="header-search"
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        aria-label="Search assets and maintenance tasks"
      />
    </form>
  );
}
