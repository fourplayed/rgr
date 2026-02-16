/**
 * AssetsTable — Sortable, paginated table with clickable rows
 */
import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAssets } from '@/hooks/useAssetData';
import { AssetStatusLabels, AssetStatusColors, AssetCategoryLabels } from '@rgr/shared';
import type { AssetStatus, AssetCategory } from '@rgr/shared';
import type { AssetFilters, AssetSort, AssetPagination } from '@/pages/assets/types';

export interface AssetsTableProps {
  isDark: boolean;
  filters: AssetFilters;
  sort: AssetSort;
  pagination: AssetPagination;
  selectedAssetId: string | null;
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onSelectAsset: (id: string) => void;
}

interface ColumnDef {
  key: string;
  label: string;
  sortable: boolean;
  width?: string;
}

const COLUMNS: ColumnDef[] = [
  { key: 'assetNumber', label: 'Asset #', sortable: true, width: '120px' },
  { key: 'category', label: 'Type', sortable: true, width: '100px' },
  { key: 'status', label: 'Status', sortable: true, width: '160px' },
  { key: 'make', label: 'Make / Model', sortable: false },
  { key: 'registrationNumber', label: 'Rego', sortable: false, width: '120px' },
  { key: 'registrationExpiry', label: 'Rego Expiry', sortable: true, width: '120px' },
  { key: 'depotName', label: 'Location', sortable: false, width: '140px' },
  { key: 'lastLocationUpdatedAt', label: 'Last Scan', sortable: true, width: '140px' },
];

export const AssetsTable = React.memo<AssetsTableProps>(
  ({ isDark, filters, sort, pagination, selectedAssetId, onSort, onPageChange, onSelectAsset }) => {
    const { data: result, isLoading, isError, error } = useAssets(filters, sort, pagination);

    const textColor = isDark ? 'text-slate-200' : 'text-white';
    const mutedColor = isDark ? 'text-slate-400' : 'text-white/70';
    const headerBg = isDark ? 'bg-[rgba(0,0,48,0.5)]' : 'bg-[rgba(0,0,120,0.3)]';
    const rowHoverBg = isDark ? 'hover:bg-[rgba(0,0,48,0.3)]' : 'hover:bg-[rgba(0,0,120,0.15)]';
    const selectedBg = isDark ? 'bg-[rgba(0,0,48,0.45)]' : 'bg-[rgba(0,0,120,0.25)]';
    const borderColor = isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.1)]';

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className={`text-center py-20 ${mutedColor}`}>
          Failed to load assets: {(error as Error)?.message}
        </div>
      );
    }

    const assets = result?.data ?? [];
    const total = result?.total ?? 0;
    const totalPages = result?.totalPages ?? 1;

    return (
      <div className="flex flex-col h-full">
        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className={`sticky top-0 z-10 ${headerBg}`}>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`text-left text-xs font-medium uppercase tracking-wider px-4 py-3 ${mutedColor} ${
                      col.sortable ? 'cursor-pointer select-none hover:text-blue-400 transition-colors' : ''
                    }`}
                    style={{ width: col.width }}
                    onClick={col.sortable ? () => onSort(col.key) : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sort.field === col.key && (
                        sort.direction === 'asc' ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className={`text-center py-16 ${mutedColor}`}>
                    No assets found
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className={`border-t ${borderColor} cursor-pointer transition-colors ${rowHoverBg} ${
                      selectedAssetId === asset.id ? selectedBg : ''
                    }`}
                    onClick={() => onSelectAsset(asset.id)}
                  >
                    <td className={`px-4 py-3 text-sm font-mono font-medium ${textColor}`}>
                      {asset.assetNumber}
                    </td>
                    <td className={`px-4 py-3 text-sm ${textColor}`}>
                      {AssetCategoryLabels[asset.category as AssetCategory] ?? asset.category}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={asset.status as AssetStatus} />
                    </td>
                    <td className={`px-4 py-3 text-sm ${textColor}`}>
                      {[asset.make, asset.model].filter(Boolean).join(' ') || '\u2014'}
                    </td>
                    <td className={`px-4 py-3 text-sm font-mono ${textColor}`}>
                      {asset.registrationNumber || '\u2014'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${mutedColor}`}>
                      {asset.registrationExpiry
                        ? new Date(asset.registrationExpiry).toLocaleDateString()
                        : '\u2014'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${textColor}`}>
                      {asset.depotName || '\u2014'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${mutedColor}`}>
                      {asset.lastLocationUpdatedAt
                        ? formatRelativeTime(asset.lastLocationUpdatedAt)
                        : 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={`flex items-center justify-between px-4 py-3 border-t ${borderColor}`}>
          <span className={`text-sm ${mutedColor}`}>
            {total} asset{total !== 1 ? 's' : ''} total
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className={`p-1.5 rounded ${textColor} disabled:opacity-30 hover:bg-white/10 transition-colors`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-sm ${mutedColor}`}>
              Page {pagination.page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className={`p-1.5 rounded ${textColor} disabled:opacity-30 hover:bg-white/10 transition-colors`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);

AssetsTable.displayName = 'AssetsTable';

// ── Helpers ──

function StatusBadge({ status }: { status: AssetStatus }) {
  const color = AssetStatusColors[status] ?? '#6b7280';
  const label = AssetStatusLabels[status] ?? status;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
