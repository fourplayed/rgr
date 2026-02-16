/**
 * AssetFiltersPanel — Category pills, status pills, depot dropdown
 */
import React, { useCallback } from 'react';
import { X } from 'lucide-react';
import {
  AssetStatus,
  AssetStatusLabels,
  AssetStatusColors,
  AssetCategory,
  AssetCategoryLabels,
} from '@rgr/shared';
import { useDepots } from '@/hooks/useAssetData';
import type { AssetFilters } from '@/pages/assets/types';

export interface AssetFiltersPanelProps {
  isDark: boolean;
  filters: AssetFilters;
  onFiltersChange: (updates: Partial<AssetFilters>) => void;
  onReset: () => void;
}

/** Static enum-derived arrays — computed once outside the component */
const ALL_STATUSES = Object.values(AssetStatus) as AssetStatus[];
const ALL_CATEGORIES = Object.values(AssetCategory) as AssetCategory[];

export const AssetFiltersPanel = React.memo<AssetFiltersPanelProps>(
  ({ isDark, filters, onFiltersChange, onReset }) => {
    const { data: depots = [] } = useDepots();

    const pillBase = isDark
      ? 'bg-slate-800/50 border-slate-700/40 text-slate-300 hover:bg-slate-700/50'
      : 'bg-white/10 border-white/15 text-white/80 hover:bg-white/20';
    const pillActive = isDark
      ? 'bg-blue-600/25 border-blue-500/40 text-blue-300'
      : 'bg-white/25 border-white/40 text-white';
    const mutedColor = isDark ? 'text-slate-400' : 'text-white/60';

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

    const toggleCategory = useCallback(
      (category: AssetCategory) => {
        const current = filters.categories;
        const next = current.includes(category)
          ? current.filter((c) => c !== category)
          : [...current, category];
        onFiltersChange({ categories: next });
      },
      [filters.categories, onFiltersChange],
    );

    const statuses = ALL_STATUSES;

    const categories = ALL_CATEGORIES;

    return (
      <div
        className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl"
        style={{
          background: isDark ? 'rgba(6, 11, 40, 0.4)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'}`,
        }}
      >
        {/* Status pills */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium uppercase tracking-wider ${mutedColor}`}>
            Status
          </span>
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filters.statuses.includes(status) ? pillActive : pillBase
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: AssetStatusColors[status] }}
              />
              {AssetStatusLabels[status]}
            </button>
          ))}
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium uppercase tracking-wider ${mutedColor}`}>
            Type
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filters.categories.includes(cat) ? pillActive : pillBase
              }`}
            >
              {AssetCategoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Depot dropdown */}
        {depots.length > 0 && (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium uppercase tracking-wider ${mutedColor}`}>
              Depot
            </span>
            <select
              value={filters.depotIds[0] ?? ''}
              onChange={(e) =>
                onFiltersChange({ depotIds: e.target.value ? [e.target.value] : [] })
              }
              className={`px-3 py-1.5 rounded-lg text-xs border outline-none transition-colors ${
                isDark
                  ? 'bg-slate-800/60 border-slate-700/50 text-slate-200'
                  : 'bg-white/10 border-white/20 text-white'
              }`}
            >
              <option value="">All Depots</option>
              {depots.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reset */}
        <button
          onClick={onReset}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${mutedColor} hover:text-white transition-colors ml-auto`}
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      </div>
    );
  }
);

AssetFiltersPanel.displayName = 'AssetFiltersPanel';
