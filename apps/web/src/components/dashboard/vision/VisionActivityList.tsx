/**
 * VisionActivityList - Vision UI styled activity/timeline list
 * Updated to use RGR color palette from COLOR_PALETTE.md
 *
 * Light Theme Implementation:
 * - Clean white background with subtle shadows
 * - Enhanced timeline indicators with better contrast
 * - Improved hover states for list items
 * - Badge colors optimized for light backgrounds
 * - Accessible color contrast ratios (WCAG AA)
 */
import React from 'react';
import { Clock, MapPin, User } from 'lucide-react';
import type { RecentScanEvent } from '@/pages/dashboard/types';
import { RGR_COLORS } from '@/styles/color-palette';

export interface VisionActivityListProps {
  events: RecentScanEvent[];
  title?: string;
  onEventClick?: (eventId: string) => void;
  onViewAll?: () => void;
  maxItems?: number;
  className?: string;
  /** Theme mode - when true, uses dark theme; when false, uses light theme */
  isDark?: boolean;
}

export const VisionActivityList = React.memo<VisionActivityListProps>(({
  events,
  title = 'Recent Activity',
  onEventClick,
  onViewAll,
  maxItems = 5,
  className = '',
  isDark = true,
}) => {
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

  const displayEvents = events.slice(0, maxItems);

  // Login card-style backgrounds - gradient filled for both themes
  // Dark theme: dark blue to lighter blue gradient (matching login card)
  // Light theme: chrome metallic gradient effect (matching login card)
  const bgStyle = isDark
    ? {
        // Dark theme: vertical gradient from dark navy to medium blue (100% opacity)
        background: 'linear-gradient(to bottom, rgb(0, 0, 40) 0%, rgb(10, 38, 84) 100%)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      }
    : {
        // Light theme: grey to light grey gradient (top to bottom) - no shadow to avoid corner artifacts
        background: 'linear-gradient(to bottom, #d1d5db 0%, #f3f4f6 100%)',
        boxShadow: 'none',
      };

  const borderColor = isDark
    ? 'rgba(235, 235, 235, 0.15)' // Dark: subtle chrome outline
    : 'rgba(107, 114, 128, 0.75)'; // Light: gray-500 at 75% opacity

  // Timeline indicator colors - matching map legend
  const getTimelineColor = (category: string) => {
    if (category === 'trailer') {
      return isDark ? '#10b981' : '#059669'; // Green - matching map legend
    }
    return isDark ? '#86efac' : '#166534'; // Green shades for dollies - matching map legend
  };

  // Get border for timeline indicator (dollies need border for visibility)
  const getTimelineBorder = (category: string) => {
    if (category === 'trailer') {
      return 'none';
    }
    return isDark ? '1px solid #4f6c72' : '1px solid rgba(255, 255, 255, 0.8)';
  };

  // Backdrop filter for dark theme only
  const backdropFilter = isDark ? 'blur(20px)' : 'none';

  return (
    <div
      className={`
        border rounded-[20px]
        overflow-hidden
        ${className}
      `}
      style={{
        ...bgStyle,
        borderColor,
        borderWidth: isDark ? '1px' : '1.5px',
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{
          borderColor: isDark
            ? `${RGR_COLORS.chrome.medium}33` // Chrome Medium 20% opacity
            : 'rgba(107, 114, 128, 0.75)', // Gray-500 at 75% opacity for light theme
          background: isDark
            ? '#060b28' // Dark header (same as nav bar)
            : '#e5e7eb', // Light grey (matching nav bar)
        }}
      >
        <h3
          className="text-lg font-medium"
          style={{ color: isDark ? RGR_COLORS.chrome.highlight : '#1e293b' }} // Slate-800 for light theme
        >
          {title}
        </h3>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm font-medium transition-colors"
            style={{
              color: isDark ? '#60a5fa' : '#2563eb', // blue-400 for dark, blue-600 for light (matching login page)
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isDark ? '#93c5fd' : '#1d4ed8'; // blue-300 for dark, blue-700 for light
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDark ? '#60a5fa' : '#2563eb';
            }}
          >
            View All
          </button>
        )}
      </div>

      {/* Activity List */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
        {displayEvents.length === 0 ? (
          <div className="py-8 text-center">
            <Clock
              className="w-10 h-10 mx-auto mb-3 opacity-50"
              style={{ color: RGR_COLORS.chrome.medium }}
            />
            <p
              className="text-sm"
              style={{ color: isDark ? RGR_COLORS.chrome.light : '#1e293b' }} // Slate-800 for light theme
            >
              No recent activity
            </p>
          </div>
        ) : (
          displayEvents.map((event, index) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onEventClick?.(event.id)}
              className="w-full flex items-start gap-3 p-2 -mx-2 rounded-lg transition-all duration-200 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{
                backgroundColor: 'transparent',
                ['--tw-ring-color' as string]: '#06b6d4', // Cyan (cyan-500) for both themes
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark
                  ? `${RGR_COLORS.navy.base}4D` // Navy Base 30% opacity
                  : 'rgba(226, 232, 240, 1.0)'; // Light: solid slate-200 on hover (100% opacity)
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = isDark ? 'none' : '0 4px 12px rgba(148, 163, 184, 0.3)'; // Solid shadow color
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Timeline indicator - matching map legend colors */}
              <div className="flex flex-col items-center">
                <div
                  className="w-3 h-3 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: getTimelineColor(event.assetCategory),
                    border: getTimelineBorder(event.assetCategory),
                    boxShadow: isDark
                      ? 'none'
                      : '0 0 8px rgba(6, 182, 212, 0.5)', // Cyan glow for better visibility
                  }}
                />
                {index < displayEvents.length - 1 && (
                  <div
                    className="w-0.5 h-full min-h-[32px] mt-1.5 rounded-full"
                    style={{
                      backgroundColor: isDark
                        ? `${RGR_COLORS.chrome.medium}4D` // Chrome Medium 30% opacity
                        : 'rgba(148, 163, 184, 0.6)', // Slate-400 at 60% for better visibility on chrome cards
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="font-semibold text-base"
                    style={{ color: isDark ? RGR_COLORS.chrome.highlight : '#1e293b' }} // Slate-800 for light theme
                  >
                    {event.assetNumber}
                  </span>
                  <span
                    className="text-sm flex-shrink-0"
                    style={{ color: isDark ? RGR_COLORS.chrome.medium : '#1e293b' }} // Slate-800 for light theme
                  >
                    {formatTime(event.scannedAt)}
                  </span>
                </div>

                {event.locationDescription && (
                  <div
                    className="flex items-center gap-1.5 text-sm mb-1"
                    style={{ color: isDark ? RGR_COLORS.chrome.light : '#1e293b' }} // Slate-800 for light theme
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{event.locationDescription}</span>
                  </div>
                )}

                <div
                  className="flex items-center gap-1.5 text-sm"
                  style={{ color: isDark ? RGR_COLORS.chrome.medium : '#1e293b' }} // Slate-800 for light theme
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{event.scannerName}</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: Optimize for frequent activity updates
  // Only re-render if the number of events changes or the first event changes
  // This prevents re-renders when activities update elsewhere in the app
  if (prevProps.events.length !== nextProps.events.length) {
    return false; // Re-render if length changed
  }

  if (prevProps.events.length === 0 && nextProps.events.length === 0) {
    return true; // Skip re-render if both are empty
  }

  // Compare first event (most recent) - sufficient for detecting new activity
  const prevFirst = prevProps.events[0];
  const nextFirst = nextProps.events[0];

  if (prevFirst?.id !== nextFirst?.id) {
    return false; // Re-render if first event changed
  }

  // Compare other props
  return (
    prevProps.title === nextProps.title &&
    prevProps.maxItems === nextProps.maxItems &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.className === nextProps.className
  );
});

VisionActivityList.displayName = 'VisionActivityList';

export default VisionActivityList;
