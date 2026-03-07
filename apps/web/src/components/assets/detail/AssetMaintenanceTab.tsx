/**
 * AssetMaintenanceTab — Maintenance records list, paginated
 */
import React, { useState } from 'react';
import { Wrench, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAssetMaintenance } from '@/hooks/useAssetData';
import {
  MaintenanceStatusLabels,
  MaintenancePriorityLabels,
  MaintenancePriorityColors,
} from '@rgr/shared';
import type { MaintenanceStatus, MaintenancePriority } from '@rgr/shared';

interface AssetMaintenanceTabProps {
  assetId: string;
  isDark: boolean;
}

export const AssetMaintenanceTab = React.memo<AssetMaintenanceTabProps>(({ assetId, isDark }) => {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useAssetMaintenance(assetId, page);

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

  const records = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;

  if (records.length === 0) {
    return <div className={`text-center py-16 text-sm ${mutedColor}`}>No maintenance records</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {records.map((record, i) => {
          const priorityColor =
            MaintenancePriorityColors[record.priority as MaintenancePriority] ?? '#6b7280';

          return (
            <div key={record.id} className={`px-5 py-3 ${i > 0 ? `border-t ${borderColor}` : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Wrench className={`w-4 h-4 ${mutedColor}`} />
                  <span className={`text-sm font-medium ${textColor}`}>{record.title}</span>
                </div>
                {/* Priority badge */}
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap"
                  style={{
                    background: `${priorityColor}20`,
                    color: priorityColor,
                    border: `1px solid ${priorityColor}40`,
                  }}
                >
                  {MaintenancePriorityLabels[record.priority as MaintenancePriority] ??
                    record.priority}
                </span>
              </div>

              {record.description && (
                <p className={`text-xs mt-1 ml-6 ${mutedColor} line-clamp-2`}>
                  {record.description}
                </p>
              )}

              <div className={`flex items-center gap-3 mt-2 ml-6 text-xs ${mutedColor}`}>
                <span>
                  {MaintenanceStatusLabels[record.status as MaintenanceStatus] ?? record.status}
                </span>
                {record.assigneeName && <span>Assigned: {record.assigneeName}</span>}
                <span>{new Date(record.createdAt).toLocaleDateString()}</span>
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

AssetMaintenanceTab.displayName = 'AssetMaintenanceTab';
