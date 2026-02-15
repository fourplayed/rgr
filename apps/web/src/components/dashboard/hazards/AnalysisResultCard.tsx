/**
 * AnalysisResultCard - Display AI hazard analysis results
 * Vision UI glassmorphism design with dark/light theme support
 *
 * Features:
 * - Photo preview with detected hazards overlay
 * - Freight identification with confidence score
 * - Hazard list with severity badges
 * - Recommended actions for each hazard
 * - Action buttons (Add to Queue, Dismiss, New Analysis)
 */
import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  Package,
  Scale,
  Layout,
  Link2,
  Clock,
  Shield,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { VisionCard } from '../vision/VisionCard';
import { RGR_COLORS } from '@/styles/color-palette';
import type { AnalysisResult, DetectedHazard } from '@/hooks/usePhotoAnalysis';
import type { HazardSeverity } from './HazardReviewCard';
import { AnalysisFeedbackPanel } from './AnalysisFeedbackPanel';
import { ImageLightbox } from './ImageLightbox';

// ============================================================================
// Types
// ============================================================================

export interface AnalysisResultCardProps {
  result: AnalysisResult;
  onAddToQueue?: (result: AnalysisResult) => void;
  onDismiss?: () => void;
  onNewAnalysis?: () => void;
  className?: string;
  isDark?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SEVERITY_CONFIG: Record<HazardSeverity, { color: string; label: string; bgOpacity: string }> = {
  critical: { color: '#ef4444', label: 'Critical', bgOpacity: 'rgba(239, 68, 68, 0.1)' },
  high: { color: '#f97316', label: 'High', bgOpacity: 'rgba(249, 115, 22, 0.1)' },
  medium: { color: '#f59e0b', label: 'Medium', bgOpacity: 'rgba(245, 158, 11, 0.1)' },
  low: { color: '#22c55e', label: 'Low', bgOpacity: 'rgba(34, 197, 94, 0.1)' },
};

// ============================================================================
// Sub-Components
// ============================================================================

interface HazardItemProps {
  hazard: DetectedHazard;
  isDark: boolean;
  index: number;
}

const HazardItem = React.memo<HazardItemProps>(({ hazard, isDark, index }) => {
  const [isExpanded, setIsExpanded] = useState(index === 0); // First item expanded by default

  const severityConfig = SEVERITY_CONFIG[hazard.severity];
  const textPrimary = isDark ? '#ffffff' : '#000000';
  const textSecondary = isDark ? '#e2e8f0' : '#000000';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
        border: `1px solid ${isDark ? 'rgba(235, 235, 235, 0.1)' : 'rgba(107, 114, 128, 0.3)'}`,
      }}
    >
      {/* Hazard Header */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Severity Badge */}
          <span
            className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide"
            style={{
              backgroundColor: severityConfig.bgOpacity,
              color: severityConfig.color,
              border: `1px solid ${severityConfig.color}`,
            }}
          >
            {severityConfig.label}
          </span>

          {/* Hazard Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold" style={{ color: textPrimary }}>
              {hazard.hazardType}
            </h4>
            <p className="text-sm mt-0.5 line-clamp-2" style={{ color: textSecondary }}>
              {hazard.description}
            </p>

            {/* Confidence Bar */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-black/20">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${hazard.confidence}%`,
                    backgroundColor: hazard.confidence >= 80 ? '#22c55e' : hazard.confidence >= 60 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <span className="text-xs font-medium" style={{ color: textMuted }}>
                {hazard.confidence}%
              </span>
            </div>
          </div>
        </div>

        {/* Expand/Collapse for Actions */}
        {hazard.recommendedActions.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 mt-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-1"
            style={{ color: isDark ? '#60a5fa' : '#2563eb' }}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
            {isExpanded ? 'Hide' : 'Show'} Recommended Actions ({hazard.recommendedActions.length})
          </button>
        )}
      </div>

      {/* Expanded Actions */}
      {isExpanded && hazard.recommendedActions.length > 0 && (
        <div
          className="px-3 pb-3 pt-2 border-t"
          style={{ borderColor: isDark ? 'rgba(235, 235, 235, 0.1)' : 'rgba(107, 114, 128, 0.2)' }}
        >
          <ul className="space-y-1.5">
            {hazard.recommendedActions.map((action, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm"
                style={{ color: textSecondary }}
              >
                <span
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
                  style={{ backgroundColor: isDark ? '#60a5fa' : '#2563eb' }}
                />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

HazardItem.displayName = 'HazardItem';

// ============================================================================
// Main Component
// ============================================================================

export const AnalysisResultCard = React.memo<AnalysisResultCardProps>(({
  result,
  onAddToQueue,
  onDismiss,
  onNewAnalysis,
  className = '',
  isDark = true,
}) => {
  const [showLightbox, setShowLightbox] = useState(false);

  const textPrimary = isDark ? '#ffffff' : '#000000';
  const textSecondary = isDark ? '#e2e8f0' : '#000000';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';

  const borderColor = isDark
    ? `${RGR_COLORS.chrome.medium}33`
    : 'rgba(107, 114, 128, 0.75)';

  const headerBg = isDark ? '#060b28' : '#e5e7eb';

  // Count hazards by severity
  const hazardCounts = result.hazards.reduce(
    (acc, h) => {
      acc[h.severity]++;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 } as Record<HazardSeverity, number>
  );

  const hasHighSeverity = hazardCounts.critical > 0 || hazardCounts.high > 0;

  return (
    <VisionCard className={className} isDark={isDark} noPadding>
      {/* Card Header */}
      <div
        className="p-4 border-b flex-shrink-0"
        style={{ borderColor, background: headerBg }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: hasHighSeverity ? '#ef4444' : '#22c55e' }} />
            <h3 className="text-lg font-medium" style={{ color: textPrimary }}>
              Analysis Results
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: textMuted }}>
            <Clock className="w-3.5 h-3.5" />
            {(result.durationMs / 1000).toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-4">
        {/* Photo Preview + Freight Info Row */}
        <div className="flex gap-4">
          {/* Photo Thumbnail - Clickable for enlarged view */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowLightbox(true)}
              className="relative w-[120px] h-[90px] rounded-lg overflow-hidden bg-black/20 group cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Click to enlarge"
            >
              <img
                src={result.photoUrl}
                alt="Analyzed photo"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-medium">Click to enlarge</span>
              </div>
              {/* Hazard count badge */}
              {result.hazards.length > 0 && (
                <div
                  className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{
                    backgroundColor: hasHighSeverity ? '#ef4444' : '#f59e0b',
                    color: '#ffffff',
                  }}
                >
                  {result.hazards.length}
                </div>
              )}
            </button>
          </div>

          {/* Freight Identification */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" style={{ color: isDark ? '#60a5fa' : '#2563eb' }} />
              <span className="text-sm font-semibold" style={{ color: textPrimary }}>
                {result.freight.primaryCategory}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: result.freight.confidence >= 80
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(245, 158, 11, 0.15)',
                  color: result.freight.confidence >= 80 ? '#22c55e' : '#f59e0b',
                }}
              >
                {result.freight.confidence}%
              </span>
            </div>

            <p className="text-sm line-clamp-2" style={{ color: textSecondary }}>
              {result.freight.description}
            </p>

            {/* Load Metrics */}
            <div className="flex flex-wrap gap-3 text-xs">
              {result.freight.estimatedWeightKg && (
                <div className="flex items-center gap-1" style={{ color: textMuted }}>
                  <Scale className="w-3 h-3" />
                  ~{(result.freight.estimatedWeightKg / 1000).toFixed(1)}t
                </div>
              )}
              {result.freight.loadDistributionScore !== undefined && (
                <div className="flex items-center gap-1" style={{ color: textMuted }}>
                  <Layout className="w-3 h-3" />
                  Distribution: {result.freight.loadDistributionScore}%
                </div>
              )}
              {result.freight.restraintCount !== undefined && (
                <div className="flex items-center gap-1" style={{ color: textMuted }}>
                  <Link2 className="w-3 h-3" />
                  {result.freight.restraintCount} restraints
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hazards Section */}
        {result.hazards.length > 0 ? (
          <div className="space-y-3">
            {/* Hazards Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: hasHighSeverity ? '#ef4444' : '#f59e0b' }} />
                <span className="text-sm font-semibold" style={{ color: textPrimary }}>
                  {result.hazards.length} Hazard{result.hazards.length !== 1 ? 's' : ''} Detected
                </span>
              </div>

              {/* Severity summary pills */}
              <div className="flex gap-1.5">
                {hazardCounts.critical > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-bold"
                    style={{ backgroundColor: SEVERITY_CONFIG.critical.bgOpacity, color: SEVERITY_CONFIG.critical.color }}
                  >
                    {hazardCounts.critical} Crit
                  </span>
                )}
                {hazardCounts.high > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-bold"
                    style={{ backgroundColor: SEVERITY_CONFIG.high.bgOpacity, color: SEVERITY_CONFIG.high.color }}
                  >
                    {hazardCounts.high} High
                  </span>
                )}
                {hazardCounts.medium > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-bold"
                    style={{ backgroundColor: SEVERITY_CONFIG.medium.bgOpacity, color: SEVERITY_CONFIG.medium.color }}
                  >
                    {hazardCounts.medium} Med
                  </span>
                )}
                {hazardCounts.low > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-bold"
                    style={{ backgroundColor: SEVERITY_CONFIG.low.bgOpacity, color: SEVERITY_CONFIG.low.color }}
                  >
                    {hazardCounts.low} Low
                  </span>
                )}
              </div>
            </div>

            {/* Blocking Warning */}
            {result.blockedFromDeparture && (
              <div
                className="flex items-start gap-2 p-3 rounded-lg"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                    Departure Blocked
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
                    Critical hazards detected. These issues must be resolved before departure.
                  </p>
                </div>
              </div>
            )}

            {/* Hazard List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {result.hazards.map((hazard, index) => (
                <HazardItem key={hazard.id} hazard={hazard} isDark={isDark} index={index} />
              ))}
            </div>
          </div>
        ) : (
          /* No Hazards - All Clear */
          <div
            className="flex items-center gap-3 p-4 rounded-lg"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
            >
              <Check className="w-5 h-5" style={{ color: '#22c55e' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                No Hazards Detected
              </p>
              <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
                The AI analysis found no safety concerns with this load.
              </p>
            </div>
          </div>
        )}

        {/* AI Accuracy Feedback Panel */}
        <AnalysisFeedbackPanel
          result={result}
          isDark={isDark}
        />

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {result.hazards.length > 0 && onAddToQueue && (
            <button
              type="button"
              onClick={() => onAddToQueue(result)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: hasHighSeverity ? '#ef4444' : '#f59e0b',
                color: '#ffffff',
              }}
            >
              <Plus className="w-4 h-4" />
              Add to Review Queue
            </button>
          )}

          {onNewAnalysis && (
            <button
              type="button"
              onClick={onNewAnalysis}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                border: '1.5px solid #3b82f6',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              New Analysis
            </button>
          )}

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                color: textMuted,
                border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
              }}
            >
              <X className="w-4 h-4" />
              Dismiss
            </button>
          )}
        </div>
      </div>

      {/* Image Lightbox for enlarged view */}
      <ImageLightbox
        src={result.photoUrl}
        alt="Analyzed freight photo"
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
      />
    </VisionCard>
  );
});

AnalysisResultCard.displayName = 'AnalysisResultCard';

export default AnalysisResultCard;
