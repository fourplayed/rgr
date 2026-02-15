/**
 * ActivityFeed - Scrollable feed of recent scan events
 */
import React from 'react';
import { Clock, Activity } from 'lucide-react';
import { ActivityItem } from './ActivityItem';
import { useTheme } from '@/hooks/useTheme';
import type { RecentScanEvent } from '@/pages/dashboard/types';

export interface ActivityFeedProps {
  events: RecentScanEvent[];
  title?: string;
  maxHeight?: number;
  emptyText?: string;
  onEventClick?: (eventId: string) => void;
  showLocations?: boolean;
  onViewAll?: () => void;
  className?: string;
}

export const ActivityFeed = React.memo<ActivityFeedProps>(({
  events,
  title = 'Recent Activity',
  maxHeight = 400,
  emptyText = 'No recent scans',
  onEventClick,
  showLocations = true,
  onViewAll,
  className = '',
}) => {
  const { isDark } = useTheme();

  const cardBg = isDark ? 'bg-slate-900/80' : 'bg-white'; // Light theme: solid white (100% opacity)
  const borderColor = isDark ? 'border-slate-700/50' : 'border-slate-200';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const mutedColor = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <section
      className={`
        ${cardBg} backdrop-blur-xl border ${borderColor}
        rounded-3xl shadow-premium p-6 lg:p-8
        ${className}
      `}
      aria-label="Recent scan events"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-xl lg:text-2xl font-bold ${textColor}`}>
            {title}
          </h2>
          <p className={`text-sm mt-1 ${mutedColor}`}>
            Last 24 hours
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className={`
                px-4 py-2 rounded-xl text-sm font-medium
                ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'}
                border transition-colors duration-200 ${textColor}
              `}
            >
              View All
            </button>
          )}
          <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
            <Clock className={`w-5 h-5 ${mutedColor}`} aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Activity list */}
      <div
        className="space-y-4 overflow-y-auto custom-scrollbar pr-2"
        style={{ maxHeight: `${maxHeight}px` }}
        role="list"
        aria-live="polite"
      >
        {events.length === 0 ? (
          <div className={`py-12 text-center ${mutedColor}`}>
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p>{emptyText}</p>
          </div>
        ) : (
          events.slice(0, 10).map((event, index) => (
            <ActivityItem
              key={event.id}
              event={event}
              onClick={onEventClick}
              showLocation={showLocations}
              isLast={index === Math.min(events.length - 1, 9)}
              animationDelay={index * 50}
            />
          ))
        )}
      </div>
    </section>
  );
});

ActivityFeed.displayName = 'ActivityFeed';

export default ActivityFeed;
