/**
 * useHazardReviewWithRealtime - Combines hazard review with real-time updates
 *
 * This hook wraps useHazardReview and useHazardAlertRealtime to provide
 * a complete solution for the hazard review panel with live updates.
 *
 * Features:
 * - All functionality from useHazardReview (fetch, filter, review)
 * - Real-time updates when new hazards are detected
 * - Audio/visual notifications for critical hazards
 * - New hazard counter badge
 */
import { useCallback, useEffect, useMemo } from 'react';
import { useHazardReview } from './useHazardReview';
import { useHazardAlertRealtime } from './useHazardAlertRealtime';
import type { HazardFilters, HazardSeverity, ReviewAction, HazardData } from '../components/dashboard/hazards';
import type { RealtimeHazardAlert } from './useHazardAlertRealtime';

// ============================================================================
// Types
// ============================================================================

export interface UseHazardReviewWithRealtimeOptions {
  /** Enable sound notifications */
  enableSound?: boolean;
  /** Enable browser notifications */
  enableBrowserNotifications?: boolean;
  /** Auto-refresh interval in ms (0 to disable) */
  autoRefreshInterval?: number;
}

export interface UseHazardReviewWithRealtimeResult {
  // From useHazardReview
  hazards: HazardData[];
  stats: {
    pendingReviews: number;
    aiAccuracy: number;
    falsePositiveRate: number;
    severityBreakdown: Record<HazardSeverity, number>;
  };
  filters: HazardFilters;
  isLoading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;

  // Actions
  setFilters: (filters: HazardFilters) => void;
  submitReview: (hazardId: string, action: ReviewAction) => Promise<void>;
  loadMore: () => void;
  refresh: () => Promise<void>;

  // Real-time additions
  isConnected: boolean;
  newAlertCount: number;
  clearNewAlertCount: () => void;
  reconnect: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useHazardReviewWithRealtime(
  options: UseHazardReviewWithRealtimeOptions = {}
): UseHazardReviewWithRealtimeResult {
  const {
    enableSound = true,
    enableBrowserNotifications = false,
    autoRefreshInterval = 0,
  } = options;

  // Base hazard review functionality
  const { state, actions } = useHazardReview();

  // Real-time subscription
  const {
    isConnected,
    newAlertCount,
    clearNewAlertCount,
    reconnect,
  } = useHazardAlertRealtime({
    statuses: ['active'], // Only listen for active (pending review) alerts
    playSound: enableSound,
    browserNotifications: enableBrowserNotifications,
    onNewAlert: useCallback((_alert: RealtimeHazardAlert) => {
      // Auto-refresh when new alert comes in
      // This ensures the list stays current
      actions.refresh();
    }, [actions]),
    onAlertUpdate: useCallback((updatedAlert: RealtimeHazardAlert) => {
      // Refresh on status changes too
      if (updatedAlert.status !== 'active') {
        actions.refresh();
      }
    }, [actions]),
  });

  // Auto-refresh at interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      actions.refresh();
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, actions]);

  // Memoize the combined result
  return useMemo(() => ({
    // State from useHazardReview
    hazards: state.hazards,
    stats: state.stats,
    filters: state.filters,
    isLoading: state.isLoading,
    error: state.error,
    page: state.page,
    hasMore: state.hasMore,

    // Actions from useHazardReview
    setFilters: actions.setFilters,
    submitReview: actions.submitReview,
    loadMore: actions.loadMore,
    refresh: actions.refresh,

    // Real-time state
    isConnected,
    newAlertCount,
    clearNewAlertCount,
    reconnect,
  }), [state, actions, isConnected, newAlertCount, clearNewAlertCount, reconnect]);
}

export default useHazardReviewWithRealtime;
