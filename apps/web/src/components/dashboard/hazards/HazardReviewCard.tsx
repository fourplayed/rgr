/**
 * HazardReviewCard - Individual hazard card for review
 * Uses Vision UI glassmorphism design
 *
 * Features:
 * - Photo thumbnail with asset badge overlay
 * - Severity badge (color-coded)
 * - Hazard type and description
 * - AI confidence score bar
 * - Review action buttons
 * - Expandable recommended actions
 */
import React, { useState } from 'react';
import { Check, X, HelpCircle, ChevronDown, MapPin, Clock, Expand } from 'lucide-react';
import { RGR_COLORS } from '@/styles/color-palette';
import { ImageLightbox } from './ImageLightbox';

export type HazardSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ReviewAction = 'confirm' | 'false_positive' | 'needs_training';

export interface HazardData {
  id: string;
  photoUrl: string;
  assetNumber: string;
  severity: HazardSeverity;
  hazardType: string;
  description: string;
  confidence: number; // 0-100
  location?: string;
  detectedAt: string; // ISO timestamp
  recommendedActions: string[];
}

export interface HazardReviewCardProps {
  hazard: HazardData;
  onReview: (hazardId: string, action: ReviewAction) => void;
  className?: string;
  isDark?: boolean;
}

// Severity colors and labels
const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', label: 'Critical', bgOpacity: 'rgba(239, 68, 68, 0.1)' },
  high: { color: '#f97316', label: 'High', bgOpacity: 'rgba(249, 115, 22, 0.1)' },
  medium: { color: '#f59e0b', label: 'Medium', bgOpacity: 'rgba(245, 158, 11, 0.1)' },
  low: { color: '#22c55e', label: 'Low', bgOpacity: 'rgba(34, 197, 94, 0.1)' },
} as const;

export const HazardReviewCard = React.memo<HazardReviewCardProps>(({
  hazard,
  onReview,
  className = '',
  isDark = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const severityConfig = SEVERITY_CONFIG[hazard.severity];
  // White text for dark theme, black for light theme
  const textPrimary = isDark ? '#ffffff' : '#000000';
  const textSecondary = isDark ? '#e2e8f0' : '#000000';
  const textMuted = isDark ? '#94a3b8' : '#000000';

  // Format timestamp
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

  const handleReview = async (action: ReviewAction) => {
    setIsProcessing(true);
    try {
      await onReview(hazard.id, action);
    } finally {
      setIsProcessing(false);
    }
  };

  // Login card-style backgrounds - gradient filled for both themes
  const cardBgStyle = isDark
    ? {
        // Dark theme: vertical gradient from dark navy to medium blue (100% opacity)
        background: 'linear-gradient(to bottom, rgb(0, 0, 40) 0%, rgb(10, 38, 84) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }
    : {
        // Light theme: grey to light grey gradient (top to bottom)
        background: 'linear-gradient(to bottom, #d1d5db 0%, #f3f4f6 100%)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      };
  const cardBorder = isDark ? 'rgba(235, 235, 235, 0.15)' : 'rgba(107, 114, 128, 0.75)';

  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg ${className}`}
      style={{
        ...cardBgStyle,
        border: `${isDark ? '1px' : '1.5px'} solid ${cardBorder}`,
        boxShadow: isDark
          ? '0 20px 40px rgba(0, 0, 0, 0.5)'
          : 'none', // No shadow on light theme to avoid corner artifacts
      }}
    >
      <div className="p-3">
        {/* Main Content Row */}
        <div className="flex gap-3">
          {/* Left: Photo Thumbnail - Click to enlarge */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="relative w-[100px] h-[72px] rounded-lg overflow-hidden bg-black/20 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              title="Click to enlarge photo"
            >
              <img
                src={hazard.photoUrl}
                alt={`Hazard detected on ${hazard.assetNumber}`}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              {/* Expand Icon Overlay - visible on hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <Expand className="w-6 h-6 text-white" />
              </div>
              {/* Asset Badge Overlay */}
              <div
                className="absolute bottom-1 left-1 px-2 py-0.5 rounded-md text-base font-semibold backdrop-blur-sm"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: RGR_COLORS.chrome.highlight,
                }}
              >
                {hazard.assetNumber}
              </div>
            </button>
          </div>

          {/* Center: Hazard Info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Severity Badge + Type */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-md text-base font-bold uppercase tracking-wide"
                style={{
                  backgroundColor: severityConfig.bgOpacity,
                  color: severityConfig.color,
                  border: `1.5px solid ${severityConfig.color}`,
                }}
              >
                {severityConfig.label}
              </span>
              <span className="text-base font-semibold" style={{ color: textPrimary }}>
                {hazard.hazardType}
              </span>
            </div>

            {/* Description */}
            <p className="text-base line-clamp-2" style={{ color: textSecondary }}>
              {hazard.description}
            </p>

            {/* Confidence Score Bar */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: textMuted }}>AI Confidence</span>
                <span className="font-semibold" style={{ color: textPrimary }}>
                  {hazard.confidence}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-black/20 backdrop-blur-sm">
                <div
                  className="h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${hazard.confidence}%`,
                    backgroundColor: hazard.confidence >= 80 ? '#22c55e' : hazard.confidence >= 60 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-3 text-sm" style={{ color: textMuted }}>
              {hazard.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{hazard.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(hazard.detectedAt)}</span>
              </div>
            </div>
          </div>

          {/* Right: Review Actions */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => handleReview('confirm')}
              disabled={isProcessing}
              className="w-8 h-8 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                border: '1.5px solid #22c55e',
              }}
              aria-label="Confirm hazard"
              title="Confirm hazard"
            >
              <Check className="w-4 h-4 mx-auto" />
            </button>

            <button
              type="button"
              onClick={() => handleReview('false_positive')}
              disabled={isProcessing}
              className="w-8 h-8 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1.5px solid #ef4444',
              }}
              aria-label="Mark as false positive"
              title="Mark as false positive"
            >
              <X className="w-4 h-4 mx-auto" />
            </button>

            <button
              type="button"
              onClick={() => handleReview('needs_training')}
              disabled={isProcessing}
              className="w-8 h-8 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                border: '1.5px solid #f59e0b',
              }}
              aria-label="Needs training"
              title="Needs training"
            >
              <HelpCircle className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>

        {/* Expandable Recommended Actions */}
        {hazard.recommendedActions.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: isDark ? `${RGR_COLORS.chrome.medium}33` : '#9ca3af' }}>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 w-full text-left text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{ color: isDark ? '#60a5fa' : '#2563eb' }} // blue-400 for dark, blue-600 for light (matching login page)
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDark ? '#93c5fd' : '#1d4ed8'; // blue-300 for dark, blue-700 for light
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isDark ? '#60a5fa' : '#2563eb';
              }}
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              />
              Recommended Actions ({hazard.recommendedActions.length})
            </button>

            {isExpanded && (
              <ul className="mt-2 space-y-1.5 pl-5 animate-fade-in">
                {hazard.recommendedActions.map((action, index) => (
                  <li
                    key={index}
                    className="text-base list-disc"
                    style={{ color: textSecondary }}
                  >
                    {action}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Image Lightbox for full-screen photo viewing */}
      <ImageLightbox
        src={hazard.photoUrl}
        alt={`Hazard photo for ${hazard.assetNumber} - ${hazard.hazardType}`}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
});

HazardReviewCard.displayName = 'HazardReviewCard';

export default HazardReviewCard;
