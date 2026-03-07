/**
 * useFleetData - React Query hook for fleet monitoring data
 *
 * Provides:
 * - Fleet statistics (total assets, by status, by category)
 * - Recent scans with location data
 * - Outstanding assets (30+ days without scan)
 * - Asset location data for map
 * - Real-time subscriptions for live updates
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getSupabaseClient,
  getFleetStatistics,
  getRecentDashboardScans,
  getOutstandingAssets,
  getAssetLocations,
  queryFromService,
} from '@rgr/shared';
import type { AnalyticsTimeRange } from '@/services/analyticsService';

// Re-export interfaces from shared for backward compatibility
export type { FleetStatistics, RecentScan, OutstandingAsset, AssetLocation } from '@rgr/shared';

/**
 * Query keys for React Query cache management
 */
export const FLEET_QUERY_KEYS = {
  statistics: (timeRange?: AnalyticsTimeRange) => ['fleet', 'statistics', timeRange] as const,
  recentScans: (limit: number) => ['fleet', 'recent-scans', limit] as const,
  outstandingAssets: (days: number) => ['fleet', 'outstanding-assets', days] as const,
  assetLocations: () => ['fleet', 'asset-locations'] as const,
} as const;

/**
 * Hook to fetch fleet statistics
 */
export function useFleetStatistics(enabled: boolean = true) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.statistics(),
    queryFn: queryFromService(getFleetStatistics),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    enabled,
  });
}

/**
 * Hook to fetch recent scans
 */
export function useRecentScans(limit: number = 20, enabled: boolean = true) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.recentScans(limit),
    queryFn: queryFromService(() => getRecentDashboardScans(limit)),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    enabled,
  });
}

/**
 * Hook to fetch outstanding assets
 */
export function useOutstandingAssets(days: number = 30, enabled: boolean = true) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.outstandingAssets(days),
    queryFn: queryFromService(() => getOutstandingAssets(days)),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    enabled,
  });
}

/**
 * Hook to fetch asset locations for map
 */
export function useAssetLocations(enabled: boolean = true) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.assetLocations(),
    queryFn: queryFromService(getAssetLocations),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 3 * 60 * 1000, // Refetch every 3 minutes
    enabled,
  });
}

/**
 * Hook for real-time fleet updates via Supabase subscriptions
 */
export function useFleetRealtime(enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseClient();

    // Subscribe to scan events
    const scanSubscription = supabase
      .channel('fleet-scans')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scan_events',
        },
        () => {
          // Invalidate recent scans and outstanding assets
          queryClient.invalidateQueries({ queryKey: ['fleet', 'recent-scans'] });
          queryClient.invalidateQueries({ queryKey: ['fleet', 'outstanding-assets'] });
          queryClient.invalidateQueries({ queryKey: ['fleet', 'asset-locations'] });
        }
      )
      .subscribe();

    // Subscribe to asset updates
    const assetSubscription = supabase
      .channel('fleet-assets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assets',
        },
        () => {
          // Invalidate statistics and locations
          queryClient.invalidateQueries({ queryKey: ['fleet', 'statistics'] });
          queryClient.invalidateQueries({ queryKey: ['fleet', 'asset-locations'] });
          queryClient.invalidateQueries({ queryKey: ['fleet', 'outstanding-assets'] });
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(scanSubscription);
      supabase.removeChannel(assetSubscription);
    };
  }, [queryClient, enabled]);
}

/**
 * Composite hook that provides all fleet data with real-time updates
 */
export function useFleetDashboard(options?: {
  recentScansLimit?: number;
  outstandingAssetsDays?: number;
  enableRealtime?: boolean;
}) {
  const {
    recentScansLimit = 20,
    outstandingAssetsDays = 30,
    enableRealtime = true,
  } = options || {};

  const statistics = useFleetStatistics();
  const recentScans = useRecentScans(recentScansLimit);
  const outstandingAssets = useOutstandingAssets(outstandingAssetsDays);
  const assetLocations = useAssetLocations();

  // Enable real-time updates
  useFleetRealtime(enableRealtime);

  return {
    statistics,
    recentScans,
    outstandingAssets,
    assetLocations,
    isLoading:
      statistics.isLoading ||
      recentScans.isLoading ||
      outstandingAssets.isLoading ||
      assetLocations.isLoading,
    isError:
      statistics.isError ||
      recentScans.isError ||
      outstandingAssets.isError ||
      assetLocations.isError,
    error: statistics.error || recentScans.error || outstandingAssets.error || assetLocations.error,
  };
}
