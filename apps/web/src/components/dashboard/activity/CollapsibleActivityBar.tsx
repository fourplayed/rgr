/**
 * CollapsibleActivityBar - Bottom activity timeline for Layout 2
 * Collapsible horizontal bar showing recent scan events
 */
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Activity, Clock, MapPin } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { RecentScanEvent } from '@/pages/dashboard/types';

export interface CollapsibleActivityBarProps {
  events: RecentScanEvent[];
  className?: string;
  onEventClick?: (eventId: string) => void;
  onViewAll?: () => void;
}

export const CollapsibleActivityBar = React.memo<CollapsibleActivityBarProps>(({
  events,
  className = '',
  onEventClick,
  onViewAll,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isDark } = useTheme();

  const barBg = isDark ? 'bg-slate-900' : 'bg-white';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const mutedColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const hoverBg = isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50';

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

  const getCategoryColor = (category: string) => {
    return category === 'trailer' ? 'bg-blue-500' : 'bg-emerald-500';
  };

  const displayEvents = events.slice(0, isExpanded ? 10 : 5);

  return (
    <div
      className={`
        ${barBg} border-t ${borderColor}
        transition-all duration-300 ease-in-out
        ${className}
      `}
      role="region"
      aria-label="Recent activity"
    >
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between
          px-4 py-2.5
          ${hoverBg}
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500
        `}
        aria-expanded={isExpanded}
        aria-controls="activity-content"
      >
        <div className="flex items-center gap-3">
          <Activity className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className={`text-sm font-medium ${textColor}`}>
            Recent Activity
          </span>
          <span className={`
            text-xs px-2 py-0.5 rounded-full
            ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}
          `}>
            {events.length} events
          </span>
        </div>
        <div className="flex items-center gap-3">
          {onViewAll && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onViewAll();
              }}
              className={`
                text-xs font-medium cursor-pointer
                ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}
              `}
            >
              View All
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className={`w-4 h-4 ${mutedColor}`} />
          ) : (
            <ChevronUp className={`w-4 h-4 ${mutedColor}`} />
          )}
        </div>
      </button>

      {/* Activity content */}
      <div
        id="activity-content"
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-80' : 'max-h-0'}
        `}
      >
        {events.length === 0 ? (
          <div className={`px-4 py-6 text-center ${mutedColor}`}>
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="px-4 pb-3">
            {/* Horizontal scrollable timeline */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {displayEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEventClick?.(event.id)}
                  className={`
                    flex-shrink-0 w-48
                    ${isDark ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'}
                    border ${borderColor}
                    rounded-lg p-3
                    text-left
                    transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                  `}
                >
                  {/* Header with asset */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${getCategoryColor(event.assetCategory)}`} />
                    <span className={`text-sm font-semibold ${textColor}`}>
                      {event.assetNumber}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    {event.locationDescription && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className={`w-3 h-3 ${mutedColor}`} />
                        <span className={`text-xs truncate ${mutedColor}`}>
                          {event.locationDescription}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className={`w-3 h-3 ${mutedColor}`} />
                      <span className={`text-xs ${mutedColor}`}>
                        {formatTime(event.scannedAt)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Collapsed preview - horizontal ticker */}
      {!isExpanded && events.length > 0 && (
        <div className="px-4 pb-2.5 flex items-center gap-4 overflow-x-auto">
          {displayEvents.slice(0, 5).map((event, index) => (
            <div
              key={event.id}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${getCategoryColor(event.assetCategory)}`} />
              <span className={`text-xs ${textColor}`}>
                {event.assetNumber}
              </span>
              <span className={`text-xs ${mutedColor}`}>
                {formatTime(event.scannedAt)}
              </span>
              {index < displayEvents.length - 1 && (
                <span className={`text-xs ${mutedColor}`}>•</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

CollapsibleActivityBar.displayName = 'CollapsibleActivityBar';

export default CollapsibleActivityBar;
