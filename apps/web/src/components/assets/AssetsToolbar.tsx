/**
 * AssetsToolbar — Search, filter toggle, view toggle, "Add Asset" button
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, Table2, Map, Plus } from 'lucide-react';
import type { AssetsViewMode } from '@/pages/assets/types';

export interface AssetsToolbarProps {
  isDark: boolean;
  viewMode: AssetsViewMode;
  search: string;
  hasActiveFilters: boolean;
  canCreate: boolean;
  onViewModeChange: (mode: AssetsViewMode) => void;
  onSearchChange: (search: string) => void;
  onToggleFilters: () => void;
  onCreateAsset: () => void;
}

export const AssetsToolbar = React.memo<AssetsToolbarProps>(
  ({
    isDark,
    viewMode,
    search,
    hasActiveFilters,
    canCreate,
    onViewModeChange,
    onSearchChange,
    onToggleFilters,
    onCreateAsset,
  }) => {
    const [localSearch, setLocalSearch] = useState(search);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    // Sync external search changes
    useEffect(() => {
      setLocalSearch(search);
    }, [search]);

    const handleSearchInput = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLocalSearch(value);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          onSearchChange(value);
        }, 300);
      },
      [onSearchChange]
    );

    const textColor = isDark ? 'text-slate-200' : 'text-white';
    const mutedColor = isDark ? 'text-slate-400' : 'text-white/70';
    const inputBg = isDark
      ? 'bg-slate-800/60 border-slate-700/50 focus:border-blue-500/50'
      : 'bg-white/10 border-white/20 focus:border-white/40';
    const btnBase = isDark
      ? 'bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60'
      : 'bg-white/10 border border-white/20 hover:bg-white/20';
    const btnActive = isDark
      ? 'bg-blue-600/30 border-blue-500/50 text-blue-400'
      : 'bg-white/25 border-white/40 text-white';

    return (
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedColor}`}
          />
          <input
            type="text"
            placeholder="Search assets..."
            value={localSearch}
            onChange={handleSearchInput}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm ${inputBg} ${textColor} placeholder:${mutedColor} outline-none transition-colors`}
            style={{ backdropFilter: 'blur(8px)' }}
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            hasActiveFilters ? btnActive : `${btnBase} ${textColor}`
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-blue-400" />
          )}
        </button>

        {/* View toggle */}
        <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-slate-700/50' : 'border-white/20'}`}>
          <button
            onClick={() => onViewModeChange('table')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              viewMode === 'table' ? btnActive : `${btnBase} ${textColor}`
            }`}
            style={{ borderRadius: 0, border: 'none' }}
          >
            <Table2 className="w-4 h-4" />
            <span>Table</span>
          </button>
          <button
            onClick={() => onViewModeChange('map')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              viewMode === 'map' ? btnActive : `${btnBase} ${textColor}`
            }`}
            style={{ borderRadius: 0, border: 'none' }}
          >
            <Map className="w-4 h-4" />
            <span>Map</span>
          </button>
        </div>

        {/* Add Asset button (managers+) */}
        {canCreate && (
          <button
            onClick={onCreateAsset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </button>
        )}
      </div>
    );
  }
);

AssetsToolbar.displayName = 'AssetsToolbar';
