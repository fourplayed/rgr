/**
 * useAnalytics — React Query hooks for analytics data
 *
 * All data is sourced from the analytics service in @rgr/shared.
 * staleTime is 5 minutes (300_000 ms) — analytics don't need live updates.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getScanFrequency,
  getAssetUtilization,
  getHazardTrends,
  getTimeBetweenScans,
  getOutstandingAnalyticsAssets,
  queryFromService,
} from '@rgr/shared';
import type {
  AnalyticsTimeRange,
  ScanFrequencyPoint,
  AssetUtilizationSnapshot,
  HazardTrendPoint,
  TimeBetweenScansPoint,
  AnalyticsOutstandingAsset,
} from '@rgr/shared';

// Re-export AnalyticsTimeRange for consumer convenience
export type { AnalyticsTimeRange } from '@rgr/shared';

/** staleTime for all analytics queries: 5 minutes */
const ANALYTICS_STALE_TIME = 300_000;

// ── Query Keys ────────────────────────────────────────────────────────────────

export const ANALYTICS_QUERY_KEYS = {
  scanFrequency: (timeRange: AnalyticsTimeRange) =>
    ['analytics', 'scanFrequency', timeRange] as const,
  assetUtilization: () => ['analytics', 'assetUtilization'] as const,
  hazardTrends: (timeRange: AnalyticsTimeRange) =>
    ['analytics', 'hazardTrends', timeRange] as const,
  timeBetweenScans: (timeRange: AnalyticsTimeRange) =>
    ['analytics', 'timeBetweenScans', timeRange] as const,
  outstandingAssets: () => ['analytics', 'outstandingAssets'] as const,
} as const;

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Scan frequency data for the given time range (scans per day).
 */
export function useScanFrequency(timeRange: AnalyticsTimeRange) {
  return useQuery<ScanFrequencyPoint[]>({
    queryKey: ANALYTICS_QUERY_KEYS.scanFrequency(timeRange),
    queryFn: queryFromService(() => getScanFrequency(timeRange)),
    staleTime: ANALYTICS_STALE_TIME,
  });
}

/**
 * Current asset utilization snapshot (counts by status).
 */
export function useAssetUtilization() {
  return useQuery<AssetUtilizationSnapshot>({
    queryKey: ANALYTICS_QUERY_KEYS.assetUtilization(),
    queryFn: queryFromService(getAssetUtilization),
    staleTime: ANALYTICS_STALE_TIME,
  });
}

/**
 * Hazard trend data (alerts over time by severity) for the given time range.
 */
export function useHazardTrends(timeRange: AnalyticsTimeRange) {
  return useQuery<HazardTrendPoint[]>({
    queryKey: ANALYTICS_QUERY_KEYS.hazardTrends(timeRange),
    queryFn: queryFromService(() => getHazardTrends(timeRange)),
    staleTime: ANALYTICS_STALE_TIME,
  });
}

/**
 * Time-between-scans histogram for the given time range.
 */
export function useTimeBetweenScans(timeRange: AnalyticsTimeRange) {
  return useQuery<TimeBetweenScansPoint[]>({
    queryKey: ANALYTICS_QUERY_KEYS.timeBetweenScans(timeRange),
    queryFn: queryFromService(() => getTimeBetweenScans(timeRange)),
    staleTime: ANALYTICS_STALE_TIME,
  });
}

/**
 * Outstanding assets (not scanned in 30+ days).
 */
export function useOutstandingAnalyticsAssets() {
  return useQuery<AnalyticsOutstandingAsset[]>({
    queryKey: ANALYTICS_QUERY_KEYS.outstandingAssets(),
    queryFn: queryFromService(() => getOutstandingAnalyticsAssets()),
    staleTime: ANALYTICS_STALE_TIME,
  });
}
