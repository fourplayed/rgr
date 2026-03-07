/**
 * AssetScanHistoryTab — Timeline of scan events, paginated
 */
import React, { useState } from 'react';
import { Scan, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAssetScans } from '@/hooks/useAssetData';
import { ScanTypeLabels } from '@rgr/shared';
import type { ScanType } from '@rgr/shared';

interface AssetScanHistoryTabProps {
  assetId: string;
  isDark: boolean;
}

export const AssetScanHistoryTab = React.memo<AssetScanHistoryTabProps>(({ assetId, isDark }) => {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useAssetScans(assetId, page);

  const textColor = isDark ? 'text-slate-200' : 'text-white';
  const mutedColor = isDark ? 'text-slate-400' : 'text-white/60';
  const borderColor = isDark ? 'border-slate-700/30' : 'border-white/10';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
      </div>
    );
  }

  const scans = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;

  if (scans.length === 0) {
    return <div className={`text-center py-16 text-sm ${mutedColor}`}>No scans recorded</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {scans.map((scan, i) => (
          <div
            key={scan.id}
            className={`flex gap-3 px-5 py-3 ${i > 0 ? `border-t ${borderColor}` : ''}`}
          >
            {/* Timeline dot */}
            <div className="flex flex-col items-center pt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />
              {i < scans.length - 1 && (
                <div className={`w-px flex-1 mt-1 ${isDark ? 'bg-slate-700/50' : 'bg-white/10'}`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Scan className={`w-3.5 h-3.5 ${mutedColor}`} />
                <span className={`text-sm font-medium ${textColor}`}>
                  {ScanTypeLabels[scan.scanType as ScanType] ?? scan.scanType}
                </span>
              </div>
              {scan.scannerName && (
                <p className={`text-xs mt-0.5 ${mutedColor}`}>by {scan.scannerName}</p>
              )}
              {scan.latitude && scan.longitude && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${mutedColor}`}>
                  <MapPin className="w-3 h-3" />
                  <span className="font-mono">
                    {scan.latitude.toFixed(4)}, {scan.longitude.toFixed(4)}
                  </span>
                </div>
              )}
              {scan.locationDescription && (
                <p className={`text-xs mt-0.5 ${mutedColor}`}>{scan.locationDescription}</p>
              )}
            </div>

            {/* Timestamp */}
            <div className={`text-xs whitespace-nowrap ${mutedColor}`}>
              {formatDateTime(scan.createdAt)}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-center gap-3 px-4 py-3 border-t ${borderColor}`}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={`p-1 rounded ${mutedColor} disabled:opacity-30 hover:text-white transition-colors`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`text-xs ${mutedColor}`}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={`p-1 rounded ${mutedColor} disabled:opacity-30 hover:text-white transition-colors`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
});

AssetScanHistoryTab.displayName = 'AssetScanHistoryTab';

function formatDateTime(dateString: string): string {
  const d = new Date(dateString);
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  );
}
