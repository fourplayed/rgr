/**
 * SearchFilterBar - Standalone search + filter bar between stat cards and map
 *
 * Extracted from MapHeader. Contains search input, filter toggle button,
 * active filter indicator, and the slide-out filter panel.
 */
import React, { useState, useMemo } from 'react';
import { Search, Filter, ZoomIn, ZoomOut, Maximize2, X, ChevronLeft, Flag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AssetFilters } from './FleetMapWithData';
import type { AssetLocation } from '@/hooks/useFleetData';

interface SearchFilterBarProps {
  isDark: boolean;
  assets: AssetLocation[];
  onSearch: (query: string) => void;
  filters: AssetFilters;
  onFiltersChange: (filters: AssetFilters) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitBounds: () => void;
  showDepotLabels: boolean;
  onToggleDepotLabels: () => void;
}

const FILTER_CATEGORIES = [
  { value: 'all', label: 'All', color: '#9ca3af' },
  { value: 'trailer', label: 'Trailers', color: '#00fff0' },
  { value: 'dolly', label: 'Dollies', color: '#bf5fff' },
] as const;

const DEPOT_LOCATIONS_ROW1 = [
  { value: 'Perth', label: 'Perth', color: '#22c55e' },
  { value: 'Karratha', label: 'Karratha', color: '#d4ff00' },
  { value: 'Hedland', label: 'Hedland', color: '#ec4899' },
  { value: 'Newman', label: 'Newman', color: '#0000FF' },
] as const;

const DEPOT_LOCATIONS_ROW2 = [
  { value: 'Wubin', label: 'Wubin', color: '#facc15' },
  { value: 'Carnarvon', label: 'Carnarvon', color: '#38bdf8' },
] as const;

const DEPOT_LOCATIONS = [...DEPOT_LOCATIONS_ROW1, ...DEPOT_LOCATIONS_ROW2];

const FILTER_STATUSES = [
  { value: 'all', label: 'All Statuses', color: '#9ca3af' },
  { value: 'serviced', label: 'Serviced', color: '#10b981' },
  { value: 'maintenance', label: 'Maintenance', color: '#f59e0b' },
  { value: 'out_of_service', label: 'Out of Service', color: '#ef4444' },
] as const;

export const SearchFilterBar = React.memo<SearchFilterBarProps>(({
  isDark,
  assets,
  onSearch,
  filters,
  onFiltersChange,
  onZoomIn,
  onZoomOut,
  onFitBounds,
  showDepotLabels,
  onToggleDepotLabels,
}) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [hasOpenedFilters, setHasOpenedFilters] = useState(false);

  const subtypes = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => { if (a.subtype) set.add(a.subtype); });
    return Array.from(set).sort();
  }, [assets]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const IconButton = ({ onClick, label, Icon }: { onClick: () => void; label: string; Icon: LucideIcon }) => (
    <button
      type="button"
      onClick={onClick}
      className={`map-header-btn ${isDark ? 'map-header-btn-dark' : 'map-header-btn-light'} relative overflow-hidden p-2 rounded-lg transition-all duration-300 ease-out hover:-translate-y-0.5`}
      aria-label={label}
    >
      <span className="relative z-[1]">
        <Icon className="w-4 h-4 text-white" />
      </span>
    </button>
  );

  const mutedColor = '#94a3b8';
  const filterLabelColor = '#e2e8f0';

  const inputStyle = isDark
    ? {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(235, 235, 235, 0.15)',
        color: '#f8fafc',
      }
    : {
        backgroundColor: 'rgba(209, 213, 219, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        color: '#ffffff',
      };

  const pillDefaultColor = isDark ? 'rgba(203, 213, 225, 0.6)' : 'rgba(255, 255, 255, 0.6)';
  const FilterPill = ({ active, label, color, onClick }: { active: boolean; label: string; color?: string; onClick: () => void }) => {
    const accent = color || pillDefaultColor;
    return (
      <button
        type="button"
        onClick={onClick}
        className="filter-pill relative text-center py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide"
        style={{
          fontFamily: "'Lato', sans-serif",
          paddingLeft: '6px',
          paddingRight: '6px',
          background: `${accent}20`,
          border: `1px solid ${active ? accent : `${accent}50`}`,
          color: active ? (color ? color : '#f1f5f9') : accent,
        }}
      >
        {active && (
          <span
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] leading-none"
            style={{ backgroundColor: accent, color: '#0f172a' }}
          >
            ✓
          </span>
        )}
        {label}
      </button>
    );
  };

  const hasActiveFilters =
    (Array.isArray(filters.category) && filters.category.length > 0) ||
    (Array.isArray(filters.status) && filters.status.length > 0) ||
    (filters.subtype && filters.subtype !== 'all') ||
    (Array.isArray(filters.depot) && filters.depot.length > 0);

  return (
    <>
      <style>{`
        /* Dark theme button */
        .map-header-btn-dark {
          background: #1e3a8a;
          border: none;
          box-shadow: 0 2px 3px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.4), inset 0 -1px 2px rgba(0, 0, 0, 0.3);
        }
        .map-header-btn-dark:hover {
          box-shadow: 0 3px 4px rgba(0, 0, 0, 0.6), 0 2px 3px rgba(0, 0, 0, 0.5), inset 0 -1px 2px rgba(0, 0, 0, 0.3);
        }
        .map-header-btn-dark:active {
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(0, 0, 0, 0.4);
        }
        .map-header-btn-dark::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
          background-size: 200% 200%;
          background-position: 0% 50%;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .map-header-btn-dark:hover::before {
          opacity: 1;
          animation: mapBtnGradient 6s ease infinite;
        }
        .map-header-btn-dark::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
          transform: translateX(-100%);
        }
        .map-header-btn-dark:hover::after {
          animation: mapBtnShimmer 2s ease-in-out infinite;
        }

        /* Light theme button */
        .map-header-btn-light {
          background: linear-gradient(135deg, #0000CC 0%, #0000AA 50%, #000088 100%);
          background-size: 200% 200%;
          background-position: 0% 50%;
          border: none;
          box-shadow: 0 2px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3), inset 0 -1px 2px rgba(0, 0, 0, 0.2);
        }
        .map-header-btn-light:hover {
          box-shadow: 0 3px 4px rgba(0, 0, 0, 0.5), 0 2px 3px rgba(0, 0, 0, 0.4), inset 0 -1px 2px rgba(0, 0, 0, 0.2);
        }
        .map-header-btn-light:active {
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        .map-header-btn-light::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #0000FF 0%, #0000CC 50%, #0000AA 100%);
          background-size: 200% 200%;
          background-position: 0% 50%;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .map-header-btn-light:hover::before {
          opacity: 1;
          animation: mapBtnGradient 6s ease infinite;
        }
        .map-header-btn-light::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
          transform: translateX(-100%);
        }
        .map-header-btn-light:hover::after {
          animation: mapBtnShimmer 2s ease-in-out infinite;
        }

        @keyframes mapBtnGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes mapBtnShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Kill browser default focus outline */
        .map-search-dark,
        .map-search-light {
          outline: none !important;
        }
        .map-search-dark:focus {
          outline: none !important;
          border-color: rgba(203, 213, 225, 0.5) !important;
        }
        .map-search-light:focus {
          outline: none !important;
          border-color: rgba(255, 255, 255, 0.7) !important;
        }

        /* Filter pills */
        .filter-pill {
          transition: all 0.25s ease;
        }
        .filter-grid-locations .filter-pill {
          padding-left: 21px;
          padding-right: 21px;
        }
        .filter-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
          filter: brightness(1.3);
          background: currentColor;
          background: color-mix(in srgb, currentColor 15%, transparent) !important;
        }

        /* Filter dropdown select */
        .filter-select {
          outline: none !important;
        }
        .filter-select:focus {
          outline: none !important;
          border-color: rgba(203, 213, 225, 0.5) !important;
        }
        .filter-select option {
          background: #1e293b;
          color: #f8fafc;
          padding: 8px;
        }

        /* Filter panel smooth slide from left */
        .filter-panel {
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
        }
        .filter-panel-open {
          transform: translateX(0);
          opacity: 1;
        }
        .filter-panel-closed {
          transform: translateX(-100%);
          opacity: 0;
          pointer-events: none;
        }

        /* Filter button shimmer — disabled while idle */
        .filter-btn-shimmer::after {
        }

        .filter-btn-zoom {
        }

        @media (prefers-reduced-motion: reduce) {
          .map-header-btn,
          .map-header-btn::before,
          .map-header-btn::after {
            animation: none !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* Search/Filter header bar */}
      <div
        style={{
          width: 'calc(100% - 48px)',
          maxWidth: '1360px',
          height: '46px',
          position: 'fixed',
          top: '296px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: isDark ? 'rgba(0, 0, 48, 0.45)' : 'rgba(0, 0, 120, 0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '12px 12px 0 0',
          border: isDark ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
          borderBottom: isDark ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: '8px',
          zIndex: 21,
        }}
      >
        {/* Filter toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowFilters(!showFilters); setHasOpenedFilters(true); }}
            className={`map-header-btn ${isDark ? 'map-header-btn-dark' : 'map-header-btn-light'} ${!showFilters && !hasOpenedFilters ? 'filter-btn-zoom filter-btn-shimmer' : ''} relative overflow-hidden px-3 py-2 rounded-lg transition-all duration-300 ease-out hover:-translate-y-0.5 flex items-center gap-1.5`}
            aria-label="Toggle filters"
          >
            <span className="relative z-[1] flex items-center gap-1.5">
              {showFilters ? <X className="w-4 h-4 text-white" /> : <Filter className="w-4 h-4 text-white" />}
              <span className="text-xs font-semibold text-white" style={{ fontFamily: "'Lato', sans-serif" }}>ASSET FILTER</span>
            </span>
          </button>
          {hasActiveFilters && !showFilters && (
            <div
              className="absolute top-0 right-0 w-2 h-2 rounded-full pointer-events-none"
              style={{ backgroundColor: '#10b981', boxShadow: '0 0 4px #10b981' }}
            />
          )}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex items-center" style={{ width: '30%' }}>
          <div className="relative flex items-center flex-1">
            <Search
              className="absolute left-3 w-4 h-4 pointer-events-none"
              style={{ color: mutedColor }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets..."
              className={`w-full pl-9 pr-4 py-1.5 rounded-lg text-sm transition-all duration-200 ${isDark ? 'map-search-dark' : 'map-search-light'}`}
              style={{
                ...inputStyle,
                fontFamily: "'Lato', sans-serif",
              }}
            />
          </div>
        </form>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <IconButton onClick={onZoomIn} label="Zoom in" Icon={ZoomIn} />
          <IconButton onClick={onZoomOut} label="Zoom out" Icon={ZoomOut} />
          <IconButton onClick={onFitBounds} label="Fit all assets" Icon={Maximize2} />
        </div>
      </div>

      {/* Filter panel - slides out from left, overlays map */}
      {/* Clip container — same size/position as the map so panel doesn't overflow */}
      <div
        style={{
          width: 'calc(100% - 48px)',
          maxWidth: '1360px',
          position: 'fixed',
          top: '342px',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 19,
        }}
      >
        <div
          className={`filter-panel ${showFilters ? 'filter-panel-open' : 'filter-panel-closed'}`}
          style={{
            width: '340px',
            position: 'absolute',
            top: 0,
            left: 0,
            background: isDark ? 'rgba(0, 0, 48, 0.3)' : 'rgba(0, 0, 120, 0.3)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '10px 16px 16px',
            overflowY: 'auto',
            maxHeight: '100%',
            pointerEvents: 'auto',
            borderRadius: '0 0 12px 0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            border: 'none',
          }}
        >
          {/* Top row — close chevron + flag toggle + clear filters */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className={`map-header-btn ${isDark ? 'map-header-btn-dark' : 'map-header-btn-light'} relative overflow-hidden p-2 rounded-lg transition-all duration-300 ease-out hover:-translate-y-0.5`}
                aria-label="Close filters"
              >
                <span className="relative z-[1]">
                  <ChevronLeft className="w-4 h-4 text-white" />
                </span>
              </button>
              <button
                type="button"
                onClick={onToggleDepotLabels}
                className={`map-header-btn ${isDark ? 'map-header-btn-dark' : 'map-header-btn-light'} relative overflow-hidden p-2 rounded-lg transition-all duration-300 ease-out hover:-translate-y-0.5`}
                aria-label="Toggle depot labels"
                style={{ opacity: showDepotLabels ? 1 : 0.4 }}
              >
                <span className="relative z-[1]">
                  <Flag className="w-4 h-4 text-white" />
                </span>
              </button>
            </div>
            {(hasActiveFilters || !showDepotLabels) && (
              <button
                type="button"
                onClick={() => {
                  onFiltersChange({ category: 'all', subtype: 'all', status: 'all', depot: 'all', lastScannedDays: 'all' });
                  if (!showDepotLabels) onToggleDepotLabels();
                }}
                className={`map-header-btn ${isDark ? 'map-header-btn-dark' : 'map-header-btn-light'} relative overflow-hidden text-xs font-semibold px-3 py-2 rounded-lg transition-all duration-300 ease-out hover:-translate-y-0.5 text-white`}
                style={{ fontFamily: "'Lato', sans-serif" }}
              >
                <span className="relative z-[1]">Clear All Filters</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-5">
            {/* Location filters */}
            <div>
              <span
                className="text-xs font-semibold uppercase tracking-wider block mb-2.5"
                style={{ color: filterLabelColor, fontFamily: "'Lato', sans-serif", marginTop: '10px' }}
              >
                Location
              </span>
              <div className="filter-grid-locations" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                  {DEPOT_LOCATIONS_ROW1.map((depot) => {
                    const currentDepots = Array.isArray(filters.depot) ? filters.depot : [];
                    const isActive = currentDepots.includes(depot.value);
                    return (
                      <FilterPill
                        key={depot.value}
                        active={isActive}
                        label={depot.label}
                        color={depot.color}
                        onClick={() => {
                          const next = isActive
                            ? currentDepots.filter((v) => v !== depot.value)
                            : [...currentDepots, depot.value];
                          onFiltersChange({ ...filters, depot: next.length === 0 ? 'all' : next });
                          if (!showDepotLabels && next.length > 0) onToggleDepotLabels();
                        }}
                      />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                  {DEPOT_LOCATIONS_ROW2.map((depot) => {
                    const currentDepots = Array.isArray(filters.depot) ? filters.depot : [];
                    const isActive = currentDepots.includes(depot.value);
                    return (
                      <FilterPill
                        key={depot.value}
                        active={isActive}
                        label={depot.label}
                        color={depot.color}
                        onClick={() => {
                          const next = isActive
                            ? currentDepots.filter((v) => v !== depot.value)
                            : [...currentDepots, depot.value];
                          onFiltersChange({ ...filters, depot: next.length === 0 ? 'all' : next });
                          if (!showDepotLabels && next.length > 0) onToggleDepotLabels();
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div
              className="w-full h-px"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            />

            {/* Asset Type filters */}
            <div>
              <span
                className="text-xs font-semibold uppercase tracking-wider block mb-2.5"
                style={{ color: filterLabelColor, fontFamily: "'Lato', sans-serif" }}
              >
                Asset Type
              </span>
              <div className="filter-grid-types" style={{ display: 'inline-flex', flexDirection: 'row' as const, gap: '5px' }}>
                {FILTER_CATEGORIES.filter((c) => c.value !== 'all').map((cat) => {
                  const currentCats = Array.isArray(filters.category) ? filters.category : [];
                  const isActive = currentCats.includes(cat.value as 'trailer' | 'dolly');
                  return (
                    <FilterPill
                      key={cat.value}
                      active={isActive}
                      label={cat.label}
                      color={cat.color}
                      onClick={() => {
                        const next = isActive
                          ? currentCats.filter((v) => v !== cat.value)
                          : [...currentCats, cat.value as 'trailer' | 'dolly'];
                        onFiltersChange({ ...filters, category: next.length === 0 ? 'all' : next });
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Subtype dropdown */}
            {subtypes.length > 0 && (
              <>
                {/* Divider */}
                <div
                  className="w-full h-px"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                />
                <div>
                  <span
                    className="text-xs font-semibold uppercase tracking-wider block mb-2.5"
                    style={{ color: filterLabelColor, fontFamily: "'Lato', sans-serif" }}
                  >
                    Sub-Type
                  </span>
                  <select
                    value={filters.subtype || 'all'}
                    onChange={(e) => onFiltersChange({ ...filters, subtype: e.target.value })}
                    className="filter-select"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 600,
                      background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(209, 213, 219, 0.1)',
                      border: `1px solid ${isDark ? 'rgba(235, 235, 235, 0.15)' : 'rgba(255, 255, 255, 0.5)'}`,
                      color: isDark ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 10px center',
                    }}
                  >
                    <option value="all">All Sub-Types</option>
                    {subtypes.map((st) => (
                      <option key={st} value={st}>
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Divider */}
            <div
              className="w-full h-px"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            />

            {/* Service Status filters */}
            <div>
              <span
                className="text-xs font-semibold uppercase tracking-wider block mb-2.5"
                style={{ color: filterLabelColor, fontFamily: "'Lato', sans-serif" }}
              >
                Service Status
              </span>
              <div className="filter-grid-status" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: '5px' }}>
                {FILTER_STATUSES.filter((s) => s.value !== 'all').map((status) => {
                  const currentStatuses = Array.isArray(filters.status) ? filters.status : [];
                  const isActive = currentStatuses.includes(status.value as 'serviced' | 'maintenance' | 'out_of_service');
                  return (
                    <FilterPill
                      key={status.value}
                      active={isActive}
                      label={status.label}
                      color={status.color}
                      onClick={() => {
                        const next = isActive
                          ? currentStatuses.filter((v) => v !== status.value)
                          : [...currentStatuses, status.value as 'serviced' | 'maintenance' | 'out_of_service'];
                        onFiltersChange({ ...filters, status: next.length === 0 ? 'all' : next });
                      }}
                    />
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
});

SearchFilterBar.displayName = 'SearchFilterBar';
