/**
 * HazardReviewStats - Stats summary for hazard review panel
 * Uses Vision UI glassmorphism design with VisionStatCard pattern
 *
 * Features:
 * - Pending reviews count (warning if > 0)
 * - AI accuracy percentage with color-coded indicators
 * - False positive rate
 * - Severity breakdown mini chart
 */
import React from 'react';
import { AlertTriangle, Target, TrendingDown, RefreshCw, Camera } from 'lucide-react';
import { VisionCard } from '../vision/VisionCard';
import { RGR_COLORS } from '@/styles/color-palette';

export interface HazardReviewStatsData {
  pendingReviews: number;
  aiAccuracy: number; // 0-100
  falsePositiveRate: number; // 0-100
  totalPhotosAnalyzed: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface HazardReviewStatsProps {
  data: HazardReviewStatsData;
  className?: string;
  isDark?: boolean;
  /** Header title for the card */
  title?: string;
  /** Header subtitle/description */
  subtitle?: string;
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Refresh button click handler */
  onRefresh?: () => void;
}

// Severity colors matching requirements
const SEVERITY_COLORS = {
  critical: '#ef4444', // red-500
  high: '#f97316',     // orange-500
  medium: '#f59e0b',   // amber-500
  low: '#22c55e',      // green-500
} as const;

export const HazardReviewStats = React.memo<HazardReviewStatsProps>(({
  data,
  className = '',
  isDark = true,
  title = 'Neural Vision Performance',
  subtitle = 'Accuracy metrics and detection statistics for freight hazard analysis',
  isLoading = false,
  onRefresh,
}) => {
  // Calculate AI accuracy color
  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 90) return '#22c55e'; // green
    if (accuracy >= 70) return RGR_COLORS.semantic.warningText; // amber (WCAG AA)
    return '#ef4444'; // red
  };

  const accuracyColor = getAccuracyColor(data.aiAccuracy);

  // Calculate total hazards
  const totalHazards = Object.values(data.severityBreakdown).reduce((sum, count) => sum + count, 0);

  // Calculate percentages for mini bar chart
  const severityPercentages = {
    critical: totalHazards > 0 ? (data.severityBreakdown.critical / totalHazards) * 100 : 0,
    high: totalHazards > 0 ? (data.severityBreakdown.high / totalHazards) * 100 : 0,
    medium: totalHazards > 0 ? (data.severityBreakdown.medium / totalHazards) * 100 : 0,
    low: totalHazards > 0 ? (data.severityBreakdown.low / totalHazards) * 100 : 0,
  };

  // White text for dark theme, black for light theme
  const textPrimary = isDark ? '#ffffff' : '#1e293b';
  const textSecondary = isDark ? '#e2e8f0' : '#475569';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';

  // Border color matching dashboard pattern
  const borderColor = isDark
    ? `${RGR_COLORS.chrome.medium}33`
    : '#9ca3af'; // Gray-400 at 100% opacity for light theme

  // Header background - matching nav bar for consistency
  const headerBg = isDark
    ? '#060b28' // Dark header (same as nav bar)
    : '#e5e7eb'; // Light grey (matching nav bar)

  return (
    <VisionCard className={className} isDark={isDark} noPadding>
      {/* Card Header - matching dashboard pattern */}
      <div
        className="p-4 border-b flex-shrink-0"
        style={{
          borderColor,
          background: headerBg,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="text-xl font-medium"
              style={{ color: textPrimary }}
            >
              {title}
            </h3>
            <p
              className="text-sm mt-0.5"
              style={{ color: textMuted }}
            >
              {subtitle}
            </p>
          </div>
          {onRefresh && (
            <>
              <style>{`
                .chrome-refresh-button {
                  position: relative;
                  overflow: hidden;
                  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
                }

                .chrome-refresh-button-light {
                  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
                  background-size: 200% 200%;
                  background-position: 0% 50%;
                  border: none;
                }

                .chrome-refresh-button-light::before {
                  content: '';
                  position: absolute;
                  inset: 0;
                  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
                  background-size: 200% 200%;
                  background-position: 0% 50%;
                  opacity: 0;
                  transition: opacity 0.3s ease;
                }

                .chrome-refresh-button-light:hover::before {
                  opacity: 1;
                  animation: refreshGradientMove 6s ease infinite;
                }

                .chrome-refresh-button-light::after {
                  content: '';
                  position: absolute;
                  inset: 0;
                  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
                  transform: translateX(-100%);
                }

                .chrome-refresh-button-light:hover::after {
                  animation: refreshShimmerSweep 2s ease-in-out infinite;
                }

                .chrome-refresh-button-dark {
                  background: #1e3a8a;
                  border: none;
                }

                .chrome-refresh-button-dark::before {
                  content: '';
                  position: absolute;
                  inset: 0;
                  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
                  background-size: 200% 200%;
                  background-position: 0% 50%;
                  opacity: 0;
                  transition: opacity 0.3s ease;
                }

                .chrome-refresh-button-dark:hover::before {
                  opacity: 1;
                  animation: refreshGradientMove 6s ease infinite;
                }

                .chrome-refresh-button-dark::after {
                  content: '';
                  position: absolute;
                  inset: 0;
                  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
                  transform: translateX(-100%);
                }

                .chrome-refresh-button-dark:hover::after {
                  animation: refreshShimmerSweep 2s ease-in-out infinite;
                }

                @keyframes refreshGradientMove {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }

                @keyframes refreshShimmerSweep {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }

                .chrome-refresh-button-content {
                  position: relative;
                  z-index: 1;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 0.5rem;
                }

                @media (prefers-reduced-motion: reduce) {
                  .chrome-refresh-button,
                  .chrome-refresh-button::before,
                  .chrome-refresh-button::after {
                    animation: none !important;
                    transition-duration: 0.01ms !important;
                  }
                }
              `}</style>
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className={`
                  chrome-refresh-button ${isDark ? 'chrome-refresh-button-dark' : 'chrome-refresh-button-light'}
                  px-4 py-2 rounded-lg text-sm font-semibold text-white
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 active:scale-95'}
                  transition-all duration-300 ease-in-out
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                `}
              >
                <span className="chrome-refresh-button-content">
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          {/* Total Photos Analyzed */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
              <span className="text-sm font-medium" style={{ color: textSecondary }}>
                Analyzed
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>
              {data.totalPhotosAnalyzed}
            </div>
          </div>

          {/* Pending Reviews */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle
                className="w-3.5 h-3.5"
                style={{ color: data.pendingReviews > 0 ? RGR_COLORS.semantic.warningText : textMuted }}
              />
              <span className="text-sm font-medium" style={{ color: textSecondary }}>
                Pending
              </span>
            </div>
            <div
              className="text-2xl font-bold"
              style={{ color: data.pendingReviews > 0 ? RGR_COLORS.semantic.warningText : textPrimary }}
            >
              {data.pendingReviews}
            </div>
          </div>

          {/* AI Accuracy */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" style={{ color: accuracyColor }} />
              <span className="text-sm font-medium" style={{ color: textSecondary }}>
                Accuracy
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: accuracyColor }}>
              {data.aiAccuracy}%
            </div>
          </div>

          {/* False Positive Rate */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" style={{ color: textMuted }} />
              <span className="text-sm font-medium" style={{ color: textSecondary }}>
                False Pos.
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: textPrimary }}>
              {data.falsePositiveRate}%
            </div>
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium" style={{ color: textSecondary }}>
            Severity Breakdown
          </h4>

          {/* Stacked Bar Chart */}
          <div className="flex h-2.5 rounded-full overflow-hidden bg-black/20 backdrop-blur-sm">
            {severityPercentages.critical > 0 && (
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${severityPercentages.critical}%`,
                  backgroundColor: SEVERITY_COLORS.critical,
                }}
                title={`Critical: ${data.severityBreakdown.critical}`}
              />
            )}
            {severityPercentages.high > 0 && (
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${severityPercentages.high}%`,
                  backgroundColor: SEVERITY_COLORS.high,
                }}
                title={`High: ${data.severityBreakdown.high}`}
              />
            )}
            {severityPercentages.medium > 0 && (
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${severityPercentages.medium}%`,
                  backgroundColor: SEVERITY_COLORS.medium,
                }}
                title={`Medium: ${data.severityBreakdown.medium}`}
              />
            )}
            {severityPercentages.low > 0 && (
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${severityPercentages.low}%`,
                  backgroundColor: SEVERITY_COLORS.low,
                }}
                title={`Low: ${data.severityBreakdown.low}`}
              />
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-4 gap-1.5 text-sm">
            <div className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: SEVERITY_COLORS.critical }}
              />
              <span style={{ color: textMuted }}>Crit ({data.severityBreakdown.critical})</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: SEVERITY_COLORS.high }}
              />
              <span style={{ color: textMuted }}>High ({data.severityBreakdown.high})</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: SEVERITY_COLORS.medium }}
              />
              <span style={{ color: textMuted }}>Med ({data.severityBreakdown.medium})</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: SEVERITY_COLORS.low }}
              />
              <span style={{ color: textMuted }}>Low ({data.severityBreakdown.low})</span>
            </div>
          </div>
        </div>
      </div>
    </VisionCard>
  );
});

HazardReviewStats.displayName = 'HazardReviewStats';

export default HazardReviewStats;
