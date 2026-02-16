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
import { getSupabaseClient } from '@rgr/shared';
import type { HazardSeverity, ReviewAction, HazardData, HazardFilters } from '../components/dashboard/hazards';
import type { HazardReviewStatsData } from '../components/dashboard/hazards/HazardReviewStats';

// ============================================================================
// Types
// ============================================================================

interface HazardAlert {
  id: string;
  freight_analysis_id: string;
  hazard_rule_id: string | null;
  photo_id: string;
  asset_id: string | null;
  scan_event_id: string | null;
  hazard_type: string;
  severity: HazardSeverity;
  confidence_score: number;
  description: string;
  evidence_points: string[];
  recommended_actions: string[];
  location_in_image: string | null;
  bounding_box: Record<string, number> | null;
  status: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  acknowledgment_type: string | null;
  manager_review_by: string | null;
  manager_review_at: string | null;
  review_outcome: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  freight_analysis?: {
    id: string;
    photo_id: string;
    created_at: string;
  };
  photos?: {
    id: string;
    storage_path: string;
    thumbnail_path: string;
  };
  assets?: {
    id: string;
    asset_number: string;
  };
}

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
    case '7d': return new Date(now - 7 * DAY_MS);
    case '30d': return new Date(now - 30 * DAY_MS);
    case '90d': return new Date(now - 90 * DAY_MS);
    default: return new Date(now - 30 * DAY_MS);
  }
}

function mapAlertToHazardData(alert: HazardAlert): HazardData {
  // photos and assets are joined directly on hazard_alerts
  const photo = alert.photos;
  const asset = alert.assets;

  // Construct photo URL from storage path (photos stored in 'photos-compressed' bucket)
  const supabase = getSupabaseClient();
  const photoUrl = photo?.storage_path
    ? supabase.storage.from('photos-compressed').getPublicUrl(photo.storage_path).data.publicUrl
    : '/api/placeholder/120/90';

  return {
    id: alert.id,
    photoUrl,
    assetNumber: asset?.asset_number || 'Unknown',
    severity: alert.severity,
    hazardType: formatHazardType(alert.hazard_type),
    description: alert.description,
    confidence: Math.round(alert.confidence_score * 100),
    location: alert.location_in_image || undefined,
    detectedAt: alert.created_at,
    recommendedActions: alert.recommended_actions || [],
  };
}

function formatHazardType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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

  // Fetch hazard alerts from database
  const fetchHazards = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Build query
      // Note: asset_id and photo_id are on hazard_alerts, not freight_analysis
      let query = supabase
        .from('hazard_alerts')
        .select(`
          *,
          freight_analysis:freight_analysis_id (
            id,
            photo_id,
            created_at
          ),
          photos:photo_id (
            id,
            storage_path,
            thumbnail_path
          ),
          assets:asset_id (
            id,
            asset_number
          )
        `)
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      // Apply status filter
      if (filters.status === 'pending') {
        query = query.eq('status', 'active');
      } else if (filters.status === 'reviewed') {
        query = query.in('status', ['acknowledged', 'resolved', 'dismissed']);
      }
      // 'all' doesn't need additional filter

      // Apply severity filter
      if (filters.severities.length > 0) {
        query = query.in('severity', filters.severities);
      }

      // Apply date range filter
      const dateStart = getDateRangeStart(filters.dateRange);
      query = query.gte('created_at', dateStart.toISOString());

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      // Map to HazardData format
      const mappedHazards = (data as HazardAlert[] || []).map(mapAlertToHazardData);

      // Apply search filter client-side (for asset number)
      const filteredHazards = filters.searchQuery
        ? mappedHazards.filter(h =>
            h.assetNumber.toLowerCase().includes(filters.searchQuery.toLowerCase())
          )
        : mappedHazards;

      if (append) {
        setHazards(prev => [...prev, ...filteredHazards]);
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
  }, [filters]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();

      // Get total photos analyzed count from freight_analysis table
      const { count: totalPhotosAnalyzed } = await supabase
        .from('freight_analysis')
        .select('*', { count: 'exact', head: true });

      // Get pending count
      const { count: pendingCount } = await supabase
        .from('hazard_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get severity breakdown
      const { data: severityData } = await supabase
        .from('hazard_alerts')
        .select('severity')
        .eq('status', 'active');

      const severityBreakdown = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      (severityData || []).forEach((item: { severity: HazardSeverity }) => {
        if (item.severity in severityBreakdown) {
          severityBreakdown[item.severity]++;
        }
      });

      // Calculate AI accuracy from reviewed alerts
      const { data: reviewedData } = await supabase
        .from('hazard_alerts')
        .select('review_outcome')
        .not('review_outcome', 'is', null);

      const totalReviewed = reviewedData?.length || 0;
      const confirmedCount = (reviewedData || []).filter(
        (r: { review_outcome: string }) => r.review_outcome === 'confirmed'
      ).length;
      const falsePositiveCount = (reviewedData || []).filter(
        (r: { review_outcome: string }) => r.review_outcome === 'false_positive'
      ).length;

      const aiAccuracy = totalReviewed > 0
        ? Math.round((confirmedCount / totalReviewed) * 100 * 10) / 10
        : 0;
      const falsePositiveRate = totalReviewed > 0
        ? Math.round((falsePositiveCount / totalReviewed) * 100 * 10) / 10
        : 0;

      // Set stats from database
      setStats({
        pendingReviews: pendingCount || 0,
        aiAccuracy,
        falsePositiveRate,
        totalPhotosAnalyzed: totalPhotosAnalyzed || 0,
        severityBreakdown,
      });
    } catch {
      // Keep default stats on error
      setStats(DEFAULT_STATS);
    }
  }, []);

  // Submit review action
  const submitReview = useCallback(async (hazardId: string, action: ReviewAction) => {
    try {
      const supabase = getSupabaseClient();

      // Map action to review outcome
      const reviewOutcome = action === 'confirm'
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
      setHazards(prev => prev.filter(h => h.id !== hazardId));

      // Update stats
      setStats(prev => ({
        ...prev,
        pendingReviews: Math.max(0, prev.pendingReviews - 1),
      }));

      // Refresh stats after a short delay to get accurate numbers
      setTimeout(fetchStats, 500);
    } catch (err) {
      // Re-throw error to be handled by the calling component
      throw err;
    }
  }, [fetchStats]);

  // Load more hazards
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchHazards(page + 1, true);
    }
  }, [fetchHazards, isLoading, hasMore, page]);

  // Refresh data
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchHazards(0, false),
      fetchStats(),
    ]);
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
  const state = useMemo<HazardReviewState>(() => ({
    hazards,
    stats,
    filters,
    isLoading,
    error,
    page,
    hasMore,
  }), [hazards, stats, filters, isLoading, error, page, hasMore]);

  // Memoize actions object
  const actions = useMemo(() => ({
    setFilters: handleFiltersChange,
    submitReview,
    loadMore,
    refresh,
  }), [handleFiltersChange, submitReview, loadMore, refresh]);

  return { state, actions };
}

export default useHazardReview;
