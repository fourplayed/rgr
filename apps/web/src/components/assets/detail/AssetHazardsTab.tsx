/**
 * AssetHazardsTab — Hazard alerts list, paginated
 */
import React, { useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAssetHazards } from '@/hooks/useAssetData';
import {
  HazardSeverityLabels,
  HazardSeverityColors,
  HazardStatusLabels,
} from '@rgr/shared';
import type { HazardSeverity, HazardStatus } from '@rgr/shared';

interface AssetHazardsTabProps {
  assetId: string;
  isDark: boolean;
}

export const AssetHazardsTab = React.memo<AssetHazardsTabProps>(
  ({ assetId, isDark }) => {
    const [page, setPage] = useState(1);
    const { data: result, isLoading } = useAssetHazards(assetId, page);

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

    const alerts = result?.data ?? [];
    const totalPages = result?.totalPages ?? 1;

    if (alerts.length === 0) {
      return (
        <div className={`text-center py-16 text-sm ${mutedColor}`}>
          No hazard alerts
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          {alerts.map((alert, i) => {
            const severityColor = HazardSeverityColors[alert.severity as HazardSeverity] ?? '#6b7280';

            return (
              <div
                key={alert.id}
                className={`px-5 py-3 ${i > 0 ? `border-t ${borderColor}` : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" style={{ color: severityColor }} />
                    <span className={`text-sm font-medium ${textColor}`}>
                      {alert.hazardType}
                    </span>
                  </div>
                  {/* Severity badge */}
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
                    style={{
                      background: `${severityColor}20`,
                      color: severityColor,
                      border: `1px solid ${severityColor}40`,
                    }}
                  >
                    {HazardSeverityLabels[alert.severity as HazardSeverity] ?? alert.severity}
                  </span>
                </div>

                <p className={`text-xs mt-1 ml-6 ${mutedColor} line-clamp-2`}>
                  {alert.description}
                </p>

                <div className={`flex items-center gap-3 mt-2 ml-6 text-xs ${mutedColor}`}>
                  <span>{HazardStatusLabels[alert.status as HazardStatus] ?? alert.status}</span>
                  {alert.confidenceScore > 0 && (
                    <span>{Math.round(alert.confidenceScore * 100)}% confidence</span>
                  )}
                  <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className={`flex items-center justify-center gap-3 px-4 py-3 border-t ${borderColor}`}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`p-1 rounded ${mutedColor} disabled:opacity-30 hover:text-white transition-colors`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-xs ${mutedColor}`}>{page} / {totalPages}</span>
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
  }
);

AssetHazardsTab.displayName = 'AssetHazardsTab';
