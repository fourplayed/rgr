/**
 * HazardReviewPanel - Main hazard review dashboard panel
 * Composes HazardReviewStats, HazardReviewFilters, HazardReviewCard, and PhotoAnalysisSection
 *
 * Features:
 * - Real-time hazard statistics
 * - Filterable hazard list
 * - Review actions with feedback
 * - Infinite scroll loading
 * - Empty state handling
 * - Error handling with retry
 * - Photo upload for AI hazard analysis
 *
 * Vision UI glassmorphism design with dark/light theme support
 */
import React, { useCallback } from 'react';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { VisionCard } from '../vision/VisionCard';
import { HazardReviewStats } from './HazardReviewStats';
import { HazardReviewCard } from './HazardReviewCard';
import { HazardReviewFilters } from './HazardReviewFilters';
import { PhotoAnalysisSection } from './PhotoAnalysisSection';
import { useHazardReview } from '@/hooks/useHazardReview';
import { RGR_COLORS } from '@/styles/color-palette';
import type { ReviewAction } from './HazardReviewCard';
import type { AnalysisResult } from '@/hooks/usePhotoAnalysis';

// ============================================================================
// Types
// ============================================================================

export interface HazardReviewPanelProps {
  className?: string;
  isDark?: boolean;
}

// ============================================================================
// Empty State Component
// ============================================================================

interface EmptyStateProps {
  isDark: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
}

function EmptyState({ isDark, hasFilters, onClearFilters }: EmptyStateProps) {
  const textPrimary = isDark ? '#ffffff' : '#1e293b';
  const textSecondary = isDark ? '#e2e8f0' : '#475569';

  return (
    <VisionCard isDark={isDark} className="text-center py-12">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)' }}
        >
          <AlertTriangle className="w-8 h-8" style={{ color: '#22c55e' }} />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: textPrimary }}>
            {hasFilters ? 'No Matching Hazards' : 'All Clear!'}
          </h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: textSecondary }}>
            {hasFilters
              ? 'No hazards match your current filters. Try adjusting your search criteria.'
              : "No pending hazards to review. The AI hasn't detected any issues recently."}
          </p>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: RGR_COLORS.bright.vibrant,
              color: '#ffffff',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>
    </VisionCard>
  );
}

// ============================================================================
// Error State Component
// ============================================================================

interface ErrorStateProps {
  isDark: boolean;
  error: string;
  onRetry: () => void;
}

function ErrorState({ isDark, error, onRetry }: ErrorStateProps) {
  const textPrimary = isDark ? '#ffffff' : '#1e293b';
  const textSecondary = isDark ? '#e2e8f0' : '#475569';

  return (
    <VisionCard isDark={isDark} className="text-center py-12">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
        >
          <AlertTriangle className="w-8 h-8" style={{ color: '#ef4444' }} />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: textPrimary }}>
            Failed to Load Hazards
          </h3>
          <p className="text-sm max-w-sm mx-auto mb-4" style={{ color: textSecondary }}>
            {error}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: RGR_COLORS.bright.vibrant,
            color: '#ffffff',
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    </VisionCard>
  );
}

// ============================================================================
// Loading State Component
// ============================================================================

interface LoadingStateProps {
  isDark: boolean;
}

function LoadingState({ isDark }: LoadingStateProps) {
  const textSecondary = isDark ? RGR_COLORS.chrome.light : '#075985';

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: RGR_COLORS.bright.vibrant }} />
        <span className="text-sm" style={{ color: textSecondary }}>
          Loading hazards...
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const HazardReviewPanel = React.memo<HazardReviewPanelProps>(
  ({ className = '', isDark = true }) => {
    const { state, actions } = useHazardReview();

    const textPrimary = isDark ? '#ffffff' : '#1e293b';
    const textSecondary = isDark ? '#e2e8f0' : '#475569';

    // Check if any filters are active
    const hasActiveFilters =
      state.filters.severities.length > 0 ||
      state.filters.status !== 'pending' ||
      state.filters.dateRange !== '30d' ||
      state.filters.searchQuery.length > 0;

    // Handle review with toast/notification feedback
    const handleReview = useCallback(
      async (hazardId: string, action: ReviewAction) => {
        try {
          await actions.submitReview(hazardId, action);
          // Could add toast notification here
        } catch {
          // Error handling - could add toast notification here
          // Error is already logged in useHazardReview hook
        }
      },
      [actions]
    );

    // Clear all filters
    const handleClearFilters = useCallback(() => {
      actions.setFilters({
        severities: [],
        status: 'pending',
        dateRange: '30d',
        searchQuery: '',
      });
    }, [actions]);

    // Handle new hazard detection from photo analysis
    const handleHazardDetected = useCallback(
      (_result: AnalysisResult) => {
        // Refresh the hazard list to include newly detected hazards
        actions.refresh();
      },
      [actions]
    );

    return (
      <div className={`space-y-6 ${className}`}>
        {/* AI Performance Stats - Full width */}
        <HazardReviewStats
          data={state.stats}
          isDark={isDark}
          title="Neural Vision Performance"
          subtitle="Accuracy metrics and detection statistics"
          isLoading={state.isLoading}
          onRefresh={actions.refresh}
        />

        {/* Filters + Photo Upload - Side by side (1:2 ratio - filters narrower, photo wider) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          <HazardReviewFilters
            filters={state.filters}
            onFiltersChange={actions.setFilters}
            isDark={isDark}
          />
          <PhotoAnalysisSection onHazardDetected={handleHazardDetected} isDark={isDark} />
        </div>

        {/* Hazards Found Section - Full width */}
        <VisionCard isDark={isDark} noPadding>
          {/* Card Header */}
          <div
            className="p-4 border-b flex-shrink-0"
            style={{
              borderColor: isDark ? `${RGR_COLORS.chrome.medium}33` : 'rgba(107, 114, 128, 0.75)',
              background: isDark ? '#060b28' : '#e5e7eb', // Dark header / Light grey (matching nav bar)
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className="w-6 h-6"
                  style={{ color: isDark ? '#ffffff' : '#1e293b' }}
                />
                <h2 className="text-lg font-medium" style={{ color: textPrimary }}>
                  {state.hazards.length} Hazard{state.hazards.length !== 1 ? 's' : ''} Found
                </h2>
              </div>
              {state.hazards.length > 0 && (
                <span className="text-xs" style={{ color: textSecondary }}>
                  Showing {state.hazards.length} results
                </span>
              )}
            </div>
          </div>

          {/* Card Content */}
          <div className="p-4 space-y-4">
            {/* Error State */}
            {state.error && !state.isLoading && (
              <ErrorState isDark={isDark} error={state.error} onRetry={actions.refresh} />
            )}

            {/* Loading State (initial) */}
            {state.isLoading && state.hazards.length === 0 && !state.error && (
              <LoadingState isDark={isDark} />
            )}

            {/* Empty State */}
            {!state.isLoading && !state.error && state.hazards.length === 0 && (
              <EmptyState
                isDark={isDark}
                hasFilters={hasActiveFilters}
                onClearFilters={handleClearFilters}
              />
            )}

            {/* Hazard Cards */}
            {state.hazards.length > 0 && (
              <>
                {state.hazards.map((hazard) => (
                  <HazardReviewCard
                    key={hazard.id}
                    hazard={hazard}
                    onReview={handleReview}
                    isDark={isDark}
                  />
                ))}

                {/* Load More Button */}
                {state.hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      type="button"
                      onClick={actions.loadMore}
                      disabled={state.isLoading}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                      style={{
                        backgroundColor: isDark
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(59, 130, 246, 0.1)',
                        color: RGR_COLORS.bright.vibrant,
                        border: `1.5px solid ${RGR_COLORS.bright.vibrant}`,
                      }}
                    >
                      {state.isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>Load More</>
                      )}
                    </button>
                  </div>
                )}

                {/* Loading indicator for pagination */}
                {state.isLoading && state.hazards.length > 0 && (
                  <div className="flex justify-center py-4">
                    <Loader2
                      className="w-5 h-5 animate-spin"
                      style={{ color: RGR_COLORS.bright.vibrant }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </VisionCard>
      </div>
    );
  }
);

HazardReviewPanel.displayName = 'HazardReviewPanel';

export default HazardReviewPanel;
