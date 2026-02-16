/**
 * AssetsToolbar -- Glassmorphic search + inline filter bar for the Assets page
 *
 * Matches the dashboard SearchFilterBar styling exactly:
 * - Same glassmorphic card container
 * - Same search input, filter pill, and button CSS
 * - Inline filter sections (Type, Sub-Type, Location, Status) always visible
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Search, Plus, X } from 'lucide-react';
import {
  AssetStatus,
  AssetStatusLabels,
  AssetStatusColors,
  AssetCategory,
  AssetCategoryLabels,
} from '@rgr/shared';
import { useDepots } from '@/hooks/useAssetData';
import type { AssetFilters } from '@/pages/assets/types';

// ── Props ──────────────────────────────────────────────────────────────────────

export interface AssetsToolbarProps {
  isDark: boolean;
  search: string;
  filters: AssetFilters;
  canCreate: boolean;
  onSearchChange: (search: string) => void;
  onFiltersChange: (updates: Partial<AssetFilters>) => void;
  onResetFilters: () => void;
  onCreateAsset: () => void;
}

// ── Category pill config ───────────────────────────────────────────────────────

const CATEGORY_PILLS: { value: AssetCategory; color: string }[] = [
  { value: AssetCategory.TRAILER, color: '#00fff0' },
  { value: AssetCategory.DOLLY, color: '#bf5fff' },
];

// ── Status pill config ──────────────────────────────────────────────────────────

const STATUS_PILLS: { value: AssetStatus; color: string }[] = (
  Object.values(AssetStatus) as AssetStatus[]
).map((s) => ({
  value: s,
  color: AssetStatusColors[s],
}));

// ── Depot pill layout (hardcoded like dashboard — always renders immediately) ─

const DEPOT_ROW1 = [
  { name: 'Perth', color: '#22c55e' },
  { name: 'Karratha', color: '#d4ff00' },
  { name: 'Hedland', color: '#ec4899' },
  { name: 'Newman', color: '#0000FF', bg: 'rgba(255, 255, 255, 0.12)' },
];

const DEPOT_ROW2 = [
  { name: 'Wubin', color: '#facc15' },
  { name: 'Carnarvon', color: '#38bdf8' },
];

// ── Component ──────────────────────────────────────────────────────────────────

export const AssetsToolbar = React.memo<AssetsToolbarProps>(
  ({
    isDark,
    search,
    filters,
    canCreate,
    onSearchChange,
    onFiltersChange,
    onResetFilters,
    onCreateAsset,
  }) => {
    // ── Debounced search ─────────────────────────────────────────────────────
    const [localSearch, setLocalSearch] = useState(search);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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
      [onSearchChange],
    );

    // ── Depot name→ID lookup (pills render immediately from hardcoded list) ─
    const { data: depots } = useDepots();

    const depotIdByName = useMemo(() => {
      if (!depots) return new Map<string, string>();
      return new Map(depots.map((d) => [d.name, d.id]));
    }, [depots]);

    // Reverse lookup: which depot name is currently selected?
    const selectedDepotName = useMemo(() => {
      if (!filters.depotId || !depots) return null;
      const found = depots.find((d) => d.id === filters.depotId);
      return found?.name ?? null;
    }, [filters.depotId, depots]);

    // ── Active filter detection ──────────────────────────────────────────────
    const hasActiveFilters =
      filters.categories.length > 0 ||
      filters.statuses.length > 0 ||
      filters.depotId !== null;

    // ── Shared style values ──────────────────────────────────────────────────
    const mutedColor = '#94a3b8';
    const filterLabelColor = '#e2e8f0';
    const pillDefaultColor = isDark ? 'rgba(203, 213, 225, 0.6)' : 'rgba(255, 255, 255, 0.6)';

    const inputStyle: React.CSSProperties = isDark
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

    // ── FilterPill (inline) ──────────────────────────────────────────────────
    const FilterPill = ({
      active,
      label,
      color,
      onClick,
    }: {
      active: boolean;
      label: string;
      color?: string;
      onClick: () => void;
    }) => {
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

    // ── Toggle helpers ────────────────────────────────────────────────────────

    const toggleCategory = useCallback(
      (cat: AssetCategory) => {
        const current = filters.categories;
        const next = current.includes(cat)
          ? current.filter((c) => c !== cat)
          : [...current, cat];
        onFiltersChange({ categories: next });
      },
      [filters.categories, onFiltersChange],
    );

    const toggleStatus = useCallback(
      (status: AssetStatus) => {
        const current = filters.statuses;
        const next = current.includes(status)
          ? current.filter((s) => s !== status)
          : [...current, status];
        onFiltersChange({ statuses: next });
      },
      [filters.statuses, onFiltersChange],
    );

    const selectDepot = useCallback(
      (depotName: string) => {
        const id = depotIdByName.get(depotName);
        if (!id) return; // depots not loaded yet
        onFiltersChange({
          depotId: filters.depotId === id ? null : id,
        });
      },
      [filters.depotId, depotIdByName, onFiltersChange],
    );

    // ── Render ───────────────────────────────────────────────────────────────
    return (
      <>
        {/* Shared CSS -- exact copy from dashboard SearchFilterBar */}
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

          @media (prefers-reduced-motion: reduce) {
            .map-header-btn,
            .map-header-btn::before,
            .map-header-btn::after {
              animation: none !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>

        {/* Glassmorphic card container */}
        <div
          style={{
            background: isDark ? 'rgba(0, 0, 48, 0.45)' : 'rgba(0, 0, 120, 0.55)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '12px',
            border: isDark ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
            padding: '16px',
          }}
        >
          {/* Row 1: Search + Status + spacer + Add Asset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            {/* Search bar */}
            <div className="relative flex items-center" style={{ width: '30%' }}>
              <Search
                className="absolute left-3 w-4 h-4 pointer-events-none"
                style={{ color: mutedColor }}
              />
              <input
                type="text"
                value={localSearch}
                onChange={handleSearchInput}
                placeholder="Search assets..."
                className={`w-full pl-9 pr-4 py-1.5 rounded-lg text-sm transition-all duration-200 ${isDark ? 'map-search-dark' : 'map-search-light'}`}
                style={{
                  ...inputStyle,
                  fontFamily: "'Lato', sans-serif",
                }}
              />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Add Asset button */}
            {canCreate && (
              <button
                type="button"
                onClick={onCreateAsset}
                className={`map-header-btn ${isDark ? 'map-header-btn-dark' : 'map-header-btn-light'} relative overflow-hidden px-3 py-2 rounded-lg transition-all duration-300 ease-out hover:-translate-y-0.5 flex items-center gap-1.5`}
              >
                <span className="relative z-[1] flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-white" />
                  <span
                    className="text-xs font-semibold text-white"
                    style={{ fontFamily: "'Lato', sans-serif" }}
                  >
                    Add Asset
                  </span>
                </span>
              </button>
            )}
          </div>

          {/* Row 2: Filter sections */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            {/* Type */}
            <FilterSection label="Type">
              <div style={{ display: 'flex', gap: '5px' }}>
                {CATEGORY_PILLS.map((cat) => (
                  <FilterPill
                    key={cat.value}
                    active={filters.categories.includes(cat.value)}
                    label={AssetCategoryLabels[cat.value]}
                    color={cat.color}
                    onClick={() => toggleCategory(cat.value)}
                  />
                ))}
              </div>
            </FilterSection>

            {/* Divider */}
            <div className="w-px h-8 self-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Sub-Type */}
            <FilterSection label="Sub-Type">
              <select
                value={filters.depotId ? '' : 'all'}
                onChange={() => {/* subtype is not in AssetFilters yet, placeholder */}}
                className="filter-select"
                style={{
                  padding: '6px 28px 6px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
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
                  backgroundPosition: 'right 8px center',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <option value="all">All Sub-Types</option>
              </select>
            </FilterSection>

            {/* Divider */}
            <div className="w-px h-8 self-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Location */}
            <FilterSection label="Location">
              <div className="filter-grid-locations" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                {[...DEPOT_ROW1, ...DEPOT_ROW2].map((depot) => (
                  <FilterPill
                    key={depot.name}
                    active={selectedDepotName === depot.name}
                    label={depot.name}
                    color={depot.color}
                    onClick={() => selectDepot(depot.name)}
                  />
                ))}
              </div>
            </FilterSection>

            {/* Divider */}
            <div className="w-px h-8 self-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Service Status */}
            <FilterSection label="Service Status">
              <div style={{ display: 'flex', gap: '5px' }}>
                {STATUS_PILLS.map((s) => (
                  <FilterPill
                    key={s.value}
                    active={filters.statuses.includes(s.value)}
                    label={AssetStatusLabels[s.value]}
                    color={s.color}
                    onClick={() => toggleStatus(s.value)}
                  />
                ))}
              </div>
            </FilterSection>

            {/* Divider + Clear All (only when filters active) */}
            {hasActiveFilters && (
              <>
                <div className="w-px h-8 self-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                <div className="flex items-center self-center">
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className={`map-header-btn ${isDark ? 'map-header-btn-dark' : 'map-header-btn-light'} relative overflow-hidden px-3 py-2 rounded-lg transition-all duration-300 ease-out hover:-translate-y-0.5 flex items-center gap-1.5`}
                  >
                    <span className="relative z-[1] flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5 text-white" />
                      <span
                        className="text-xs font-semibold text-white whitespace-nowrap"
                        style={{ fontFamily: "'Lato', sans-serif" }}
                      >
                        Clear All
                      </span>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  },
);

AssetsToolbar.displayName = 'AssetsToolbar';

// ── FilterSection helper ─────────────────────────────────────────────────────

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: '#e2e8f0', fontFamily: "'Lato', sans-serif" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
