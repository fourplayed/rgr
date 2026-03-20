/**
 * OutstandingAssetsTable — table of assets not scanned within the expected period.
 *
 * Sort order: longest overdue first (null daysSinceLastScan treated as Infinity → tops list).
 * Rows with daysSinceLastScan > 60 are highlighted in amber.
 */
import React, { useMemo } from 'react';
import type { AnalyticsOutstandingAsset } from '@/services/analyticsService';
import { RGR_COLORS } from '@/styles/color-palette';

export interface OutstandingAssetsTableProps {
  data: AnalyticsOutstandingAsset[];
  isLoading?: boolean;
  onExportCsv?: () => void;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return 'Never';
  return new Date(isoDate).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const headerStyle: React.CSSProperties = {
  color: RGR_COLORS.chrome.medium,
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  padding: '10px 12px',
  textAlign: 'left' as const,
  borderBottom: `1px solid rgba(235,235,235,0.1)`,
  whiteSpace: 'nowrap' as const,
};

const cellStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  color: RGR_COLORS.chrome.light,
  borderBottom: `1px solid rgba(235,235,235,0.06)`,
  whiteSpace: 'nowrap' as const,
};

export const OutstandingAssetsTable: React.FC<OutstandingAssetsTableProps> = ({
  data,
  isLoading = false,
  onExportCsv,
}) => {
  const sorted = useMemo(
    () =>
      [...data].sort((a, b) => {
        const aDays = a.daysSinceLastScan ?? Infinity;
        const bDays = b.daysSinceLastScan ?? Infinity;
        return bDays - aDays; // descending — longest first
      }),
    [data]
  );

  return (
    <div>
      {/* Toolbar */}
      {onExportCsv && (
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={onExportCsv}
            className="px-3 py-1.5 text-sm rounded-lg border transition-colors duration-150 hover:opacity-80"
            style={{
              backgroundColor: 'rgba(59,130,246,0.15)',
              borderColor: `${RGR_COLORS.bright.vibrant}44`,
              color: RGR_COLORS.bright.sky,
            }}
          >
            Export CSV
          </button>
        </div>
      )}

      {isLoading ? (
        <div
          data-testid="table-skeleton"
          className="animate-pulse space-y-2"
          aria-label="Loading table"
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-white/5" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
          No data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th scope="col" style={headerStyle}>
                  Asset Number
                </th>
                <th scope="col" style={headerStyle}>
                  Category
                </th>
                <th scope="col" style={headerStyle}>
                  Status
                </th>
                <th scope="col" style={headerStyle}>
                  Last Scanned
                </th>
                <th scope="col" style={headerStyle}>
                  Days Overdue
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((asset) => {
                const isOverdue = (asset.daysSinceLastScan ?? Infinity) > 60;
                const rowBg = isOverdue ? 'rgba(245, 158, 11, 0.06)' : 'transparent';
                const overdueColor = isOverdue
                  ? RGR_COLORS.semantic.warning
                  : RGR_COLORS.chrome.light;

                return (
                  <tr key={asset.id} style={{ backgroundColor: rowBg }}>
                    <td style={cellStyle}>{asset.assetNumber}</td>
                    <td style={cellStyle}>{asset.category}</td>
                    <td style={{ ...cellStyle, textTransform: 'capitalize' }}>{asset.status}</td>
                    <td style={cellStyle}>{formatDate(asset.lastScanDate)}</td>
                    <td
                      style={{
                        ...cellStyle,
                        color: overdueColor,
                        fontWeight: isOverdue ? 600 : 400,
                      }}
                    >
                      {asset.daysSinceLastScan == null ? '—' : asset.daysSinceLastScan}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OutstandingAssetsTable;
