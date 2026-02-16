/**
 * RightSidePanel - Tactical Operations right sidebar
 * Layout 5: Stats strip + Quick actions + Activity feed in one panel
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Truck,
  CheckCircle,
  Wrench,
  XCircle,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { FleetStatistics, RecentScanEvent } from '@/pages/dashboard/types';

export interface QuickActionConfig {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'default';
}

export interface RightSidePanelProps {
  statistics: FleetStatistics | null;
  recentScans: RecentScanEvent[];
  quickActions: QuickActionConfig[];
  onEventClick?: (eventId: string) => void;
  onViewAllActivity?: () => void;
  className?: string;
}

export const RightSidePanel = React.memo<RightSidePanelProps>(({
  statistics,
  recentScans,
  quickActions,
  onEventClick,
  onViewAllActivity,
  className = '',
}) => {
  const { isDark } = useTheme();

  const panelBg = isDark ? 'bg-slate-900' : 'bg-white';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const mutedColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const sectionBg = isDark ? 'bg-slate-800/50' : 'bg-slate-50';

  const stats = statistics ?? {
    totalAssets: 0,
    activeAssets: 0,
    inMaintenance: 0,
    outOfService: 0,
    trailerCount: 0,
    dollyCount: 0,
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const statItems = [
    { label: 'Total', value: stats.totalAssets, icon: Truck, color: 'text-blue-500' },
    { label: 'Serviced', value: stats.activeAssets, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Maintenance', value: stats.inMaintenance, icon: Wrench, color: 'text-amber-500' },
    { label: 'Out of Service', value: stats.outOfService, icon: XCircle, color: 'text-red-500' },
  ];

  return (
    <aside
      className={`
        w-80 flex-shrink-0 h-full
        ${panelBg} border-l ${borderColor}
        flex flex-col
        overflow-hidden
        ${className}
      `}
      aria-label="Dashboard sidebar"
    >
      {/* Quick Stats Strip */}
      <div className={`p-4 border-b ${borderColor}`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${mutedColor}`}>
          Fleet Status
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {statItems.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`
                  ${sectionBg} rounded-lg p-3
                  flex items-center gap-2
                `}
              >
                <Icon className={`w-4 h-4 ${stat.color}`} aria-hidden="true" />
                <div>
                  <p className={`text-lg font-bold ${textColor}`}>{stat.value}</p>
                  <p className={`text-xs ${mutedColor}`}>{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`p-4 border-b ${borderColor}`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${mutedColor}`}>
          Quick Actions
        </h2>
        <div className="space-y-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  text-sm font-medium
                  transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${action.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : `${sectionBg} ${textColor} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`
                  }
                `}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="flex-1 text-left">{action.label}</span>
                <ChevronRight className="w-4 h-4 opacity-50" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="flex-1 flex flex-col min-h-0 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-xs font-semibold uppercase tracking-wider ${mutedColor}`}>
            Recent Updates
          </h2>
          {onViewAllActivity && (
            <button
              type="button"
              onClick={onViewAllActivity}
              className={`text-xs font-medium ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
            >
              View All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
          {recentScans.length === 0 ? (
            <div className={`py-8 text-center ${mutedColor}`}>
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            recentScans.slice(0, 8).map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onEventClick?.(event.id)}
                className={`
                  w-full text-left p-3 rounded-lg
                  ${sectionBg}
                  hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}
                  transition-colors duration-150
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Category indicator */}
                  <div className={`
                    w-2 h-2 rounded-full mt-1.5 flex-shrink-0
                    ${event.assetCategory === 'trailer' ? 'bg-blue-500' : 'bg-emerald-500'}
                  `} />

                  <div className="flex-1 min-w-0">
                    {/* Asset number and time */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold ${textColor}`}>
                        {event.assetNumber}
                      </span>
                      <span className={`text-xs ${mutedColor} flex-shrink-0`}>
                        {formatTime(event.scannedAt)}
                      </span>
                    </div>

                    {/* Location */}
                    {event.locationDescription && (
                      <div className={`flex items-center gap-1 mt-1 ${mutedColor}`}>
                        <MapPin className="w-3 h-3" aria-hidden="true" />
                        <span className="text-xs truncate">{event.locationDescription}</span>
                      </div>
                    )}

                    {/* Scanner */}
                    <p className={`text-xs mt-1 ${mutedColor}`}>
                      Scanned by {event.scannerName}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </aside>
  );
});

RightSidePanel.displayName = 'RightSidePanel';

export default RightSidePanel;
