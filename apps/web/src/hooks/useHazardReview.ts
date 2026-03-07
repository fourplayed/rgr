/**
 * useHazardReview - Hook for managing hazard review state and actions
 * Fetches hazard alerts from the edge function and provides review actions
 *
 * Features:
 * - Fetch pending hazard alerts with pagination
 * - Submit reviews (confirm, false_positive, needs_training)
 * - Filter by severity, status, date range
 * - Calculate review statistics
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { getSupabaseClient, getHazardAlertsForReview, getHazardReviewStats } from '@rgr/shared';
import type { HazardAlertForReview } from '@rgr/shared';
import type {
  HazardSeverity,
  ReviewAction,
  HazardData,
  HazardFilters,
} from '../components/dashboard/hazards';
import type { HazardReviewStatsData } from '../components/dashboard/hazards/HazardReviewStats';

// ============================================================================
// Types
// ============================================================================

interface HazardReviewState {
  hazards: HazardData[];
  stats: HazardReviewStatsData;
  filters: HazardFilters;
  isLoading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
}

interface UseHazardReviewResult {
  state: HazardReviewState;
  actions: {
    setFilters: (filters: HazardFilters) => void;
    submitReview: (hazardId: string, action: ReviewAction) => Promise<void>;
    loadMore: () => void;
    refresh: () => Promise<void>;
  };
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_FILTERS: HazardFilters = {
  severities: [],
  status: 'pending',
  dateRange: '30d',
  searchQuery: '',
};

const DEFAULT_STATS: HazardReviewStatsData = {
  pendingReviews: 0,
  aiAccuracy: 0,
  falsePositiveRate: 0,
  totalPhotosAnalyzed: 0,
  severityBreakdown: {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  },
};

const PAGE_SIZE = 20;

// Key for storing reviewed hazard IDs in localStorage
const REVIEWED_HAZARDS_KEY = 'rgr_reviewed_hazards';

// Get reviewed hazard IDs from localStorage
function getReviewedHazardIds(): Set<string> {
  try {
    const stored = localStorage.getItem(REVIEWED_HAZARDS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Save reviewed hazard ID to localStorage
function saveReviewedHazardId(hazardId: string): void {
  try {
    const reviewed = getReviewedHazardIds();
    reviewed.add(hazardId);
    localStorage.setItem(REVIEWED_HAZARDS_KEY, JSON.stringify([...reviewed]));
  } catch {
    // Silently fail - localStorage errors are non-critical for this feature
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDateRangeStart(range: string): Date {
  const now = Date.now();
  const DAY_MS = 86400000;
  switch (range) {
    case '7d':
      return new Date(now - 7 * DAY_MS);
    case '30d':
      return new Date(now - 30 * DAY_MS);
    case '90d':
      return new Date(now - 90 * DAY_MS);
    default:
      return new Date(now - 30 * DAY_MS);
  }
}

function mapAlertToHazardData(alert: HazardAlertForReview): HazardData {
  const photo = alert.photo;
  const asset = alert.asset;

  // Construct photo URL from storage path (photos stored in 'photos-compressed' bucket)
  const supabase = getSupabaseClient();
  const photoUrl = photo?.storagePath
    ? supabase.storage.from('photos-compressed').getPublicUrl(photo.storagePath).data.publicUrl
    : '/api/placeholder/120/90';

  const data: HazardData = {
    id: alert.id,
    photoUrl,
    assetNumber: asset?.assetNumber || 'Unknown',
    severity: alert.severity as HazardSeverity,
    hazardType: formatHazardType(alert.hazardType),
    description: alert.description,
    confidence: Math.round(alert.confidenceScore * 100),
    detectedAt: alert.createdAt,
    recommendedActions: alert.recommendedActions || [],
  };
  if (alert.locationInImage) data.location = alert.locationInImage;
  return data;
}

function formatHazardType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useHazardReview(): UseHazardReviewResult {
  const [hazards, setHazards] = useState<HazardData[]>([]);
  const [stats, setStats] = useState<HazardReviewStatsData>(DEFAULT_STATS);
  const [filters, setFilters] = useState<HazardFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Fetch hazard alerts via shared service
  const fetchHazards = useCallback(
    async (pageNum: number = 0, append: boolean = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const dateStart = getDateRangeStart(filters.dateRange);

        const result = await getHazardAlertsForReview({
          page: pageNum,
          pageSize: PAGE_SIZE,
          status:
            filters.status === 'pending'
              ? 'pending'
              : filters.status === 'reviewed'
                ? 'reviewed'
                : 'all',
          severities: filters.severities.length > 0 ? filters.severities : undefined,
          dateStart: dateStart.toISOString(),
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        // Map to HazardData format
        const mappedHazards = result.data.map(mapAlertToHazardData);

        // Apply search filter client-side (for asset number)
        const filteredHazards = filters.searchQuery
          ? mappedHazards.filter((h) =>
              h.assetNumber.toLowerCase().includes(filters.searchQuery.toLowerCase())
            )
          : mappedHazards;

        if (append) {
          setHazards((prev) => [...prev, ...filteredHazards]);
        } else {
          setHazards(filteredHazards);
        }

        setHasMore(filteredHazards.length === PAGE_SIZE);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch hazards');
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  // Fetch statistics via shared service
  const fetchStats = useCallback(async () => {
    const result = await getHazardReviewStats();
    if (result.success) {
      setStats(result.data as HazardReviewStatsData);
    } else {
      // Keep default stats on error
      setStats(DEFAULT_STATS);
    }
  }, []);

  // Submit review action
  const submitReview = useCallback(
    async (hazardId: string, action: ReviewAction) => {
      try {
        const supabase = getSupabaseClient();

        // Map action to review outcome
        const reviewOutcome =
          action === 'confirm'
            ? 'confirmed'
            : action === 'false_positive'
              ? 'false_positive'
              : 'needs_training';

        // Call the hazard-review edge function
        const { error: reviewError } = await supabase.functions.invoke('hazard-review', {
          body: {
            alertId: hazardId,
            reviewOutcome,
            wasAccurate: action === 'confirm',
            feedbackNotes: action === 'needs_training' ? 'Flagged for additional training' : null,
          },
        });

        if (reviewError) {
          throw new Error(reviewError.message);
        }

        // Save to localStorage so it never returns
        saveReviewedHazardId(hazardId);

        // Remove reviewed hazard from list
        setHazards((prev) => prev.filter((h) => h.id !== hazardId));

        // Update stats
        setStats((prev) => ({
          ...prev,
          pendingReviews: Math.max(0, prev.pendingReviews - 1),
        }));

        // Refresh stats after a short delay to get accurate numbers
        setTimeout(fetchStats, 500);
      } catch (err) {
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [fetchStats]
  );

  // Load more hazards
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchHazards(page + 1, true);
    }
  }, [fetchHazards, isLoading, hasMore, page]);

  // Refresh data
  const refresh = useCallback(async () => {
    await Promise.all([fetchHazards(0, false), fetchStats()]);
  }, [fetchHazards, fetchStats]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: HazardFilters) => {
    setFilters(newFilters);
    setPage(0);
    setHasMore(true);
  }, []);

  // Fetch hazards on mount and when filters change (covers initial load)
  useEffect(() => {
    fetchHazards(0, false);
    fetchStats();
  }, [filters, fetchHazards, fetchStats]);

  // Memoize state object
  const state = useMemo<HazardReviewState>(
    () => ({
      hazards,
      stats,
      filters,
      isLoading,
      error,
      page,
      hasMore,
    }),
    [hazards, stats, filters, isLoading, error, page, hasMore]
  );

  // Memoize actions object
  const actions = useMemo(
    () => ({
      setFilters: handleFiltersChange,
      submitReview,
      loadMore,
      refresh,
    }),
    [handleFiltersChange, submitReview, loadMore, refresh]
  );

  return { state, actions };
}

export default useHazardReview;
