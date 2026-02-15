/**
 * ActivityItem - Single scan event row with timeline connector
 */
import React, { useMemo, useCallback } from 'react';
import { Activity, Truck, Circle } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { RecentScanEvent } from '@/pages/dashboard/types';

export interface ActivityItemProps {
  event: RecentScanEvent;
  onClick?: (eventId: string) => void;
  showLocation?: boolean;
  isLast?: boolean;
  animationDelay?: number;
}

interface CategoryConfig {
  label: string;
  color: string;
  bgColor: string;
  gradient: string;
  glow: string;
}

const CATEGORY_CONFIG: Record<'trailer' | 'dolly', CategoryConfig> = {
  trailer: {
    label: 'Trailer',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-glow',
  },
  dolly: {
    label: 'Dolly',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    gradient: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-glow',
  },
};

function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export const ActivityItem = React.memo<ActivityItemProps>(({
  event,
  onClick,
  showLocation = true,
  isLast = false,
  animationDelay = 0,
}) => {
  const { isDark } = useTheme();

  const timeAgo = useMemo(() => formatTimeAgo(event.scannedAt), [event.scannedAt]);
  const categoryConfig = useMemo(
    () => CATEGORY_CONFIG[event.assetCategory] || CATEGORY_CONFIG.trailer,
    [event.assetCategory]
  );

  const handleClick = useCallback(() => {
    onClick?.(event.id);
  }, [onClick, event.id]);

  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subtitleColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100';
  const borderColor = isDark ? 'border-white/10 hover:border-white/20' : 'border-slate-200 hover:border-slate-300';

  return (
    <div
      className="group relative flex gap-4 animate-fade-in-up"
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : 'listitem'}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && handleClick() : undefined}
    >
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 to-transparent" />
      )}

      {/* Icon bubble */}
      <div className={`
        relative z-10 flex-shrink-0 w-10 h-10 rounded-full
        bg-gradient-to-br ${categoryConfig.gradient}
        flex items-center justify-center
        shadow-lg ${categoryConfig.glow}
        ring-4 ${isDark ? 'ring-slate-800' : 'ring-white'}
        group-hover:scale-110 transition-transform duration-300
      `}>
        {event.assetCategory === 'trailer' ? (
          <Truck className="w-5 h-5 text-white" aria-hidden="true" />
        ) : (
          <Circle className="w-5 h-5 text-white" aria-hidden="true" />
        )}
      </div>

      {/* Content card */}
      <div className={`
        flex-1 p-4 rounded-xl backdrop-blur-sm border
        ${cardBg} ${borderColor}
        transition-all duration-300
        ${onClick ? 'cursor-pointer group-hover:translate-x-1' : ''}
      `}>
        <div className="flex items-start justify-between mb-1">
          <p className={`font-semibold ${textColor}`}>{event.assetNumber}</p>
          <span className={`text-xs whitespace-nowrap ml-4 ${subtitleColor}`}>
            {timeAgo}
          </span>
        </div>

        <p className={`text-sm mb-2 ${subtitleColor}`}>
          Scanned by {event.scannerName}
          {showLocation && event.locationDescription && (
            <span> at {event.locationDescription}</span>
          )}
        </p>

        {/* Asset tag */}
        <div className={`
          inline-flex items-center gap-2 px-3 py-1 rounded-full
          ${categoryConfig.bgColor} border border-current/20
        `}>
          <Activity className={`w-3 h-3 ${categoryConfig.color}`} aria-hidden="true" />
          <span className={`text-xs font-medium ${categoryConfig.color}`}>
            {categoryConfig.label}
          </span>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.event.scannedAt === nextProps.event.scannedAt &&
    prevProps.showLocation === nextProps.showLocation &&
    prevProps.isLast === nextProps.isLast
  );
});

ActivityItem.displayName = 'ActivityItem';

export default ActivityItem;
