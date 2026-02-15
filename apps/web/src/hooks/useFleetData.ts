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
import { getSupabase } from '@rgr/shared';
import type { AnalyticsTimeRange } from '@/services/analyticsService';

/**
 * Fleet statistics data
 */
export interface FleetStatistics {
  totalAssets: number;
  activeAssets: number;
  inMaintenance: number;
  outOfService: number;
  decommissioned: number;
  trailerCount: number;
  dollyCount: number;
}

/**
 * Recent scan event data
 */
export interface RecentScan {
  id: string;
  assetId: string;
  assetNumber: string;
  assetCategory: string;
  scanType: string;
  scannedAt: string;
  scannedBy: string | null;
  scannerName: string | null;
  latitude: number | null;
  longitude: number | null;
  locationDescription?: string;
}

/**
 * Outstanding asset data (not scanned in 30+ days)
 */
export interface OutstandingAsset {
  id: string;
  assetNumber: string;
  category: string;
  status: string;
  lastScanDate: string | null;
  daysSinceLastScan: number | null;
  lastLocation?: {
    latitude: number;
    longitude: number;
  } | null;
}

/**
 * Asset location for map
 */
export interface AssetLocation {
  id: string;
  assetNumber: string;
  category: string;
  subtype: string | null;
  status: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  lastUpdated: string;
  recentScanCount?: number;
}

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
 * Fetch fleet statistics
 */
async function fetchFleetStatistics(): Promise<FleetStatistics> {
  const supabase = getSupabase();

  const { data: assets, error } = await supabase
    .from('assets')
    .select('status, category')
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to fetch fleet statistics: ${error.message}`);
  }

  // Count by status
  const statusCounts = {
    active: 0,
    maintenance: 0,
    out_of_service: 0,
    decommissioned: 0,
  };

  // Count by category
  const categoryCounts = {
    trailer: 0,
    dolly: 0,
  };

  assets?.forEach((asset) => {
    const status = asset.status as keyof typeof statusCounts;
    if (status in statusCounts) {
      statusCounts[status]++;
    }

    const category = asset.category as keyof typeof categoryCounts;
    if (category in categoryCounts) {
      categoryCounts[category]++;
    }
  });

  return {
    totalAssets: assets?.length || 0,
    activeAssets: statusCounts.active,
    inMaintenance: statusCounts.maintenance,
    outOfService: statusCounts.out_of_service,
    decommissioned: statusCounts.decommissioned,
    trailerCount: categoryCounts.trailer,
    dollyCount: categoryCounts.dolly,
  };
}

/**
 * Fetch recent scans
 */
async function fetchRecentScans(limit: number): Promise<RecentScan[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('scan_events')
    .select(`
      id,
      asset_id,
      scan_type,
      created_at,
      scanned_by,
      latitude,
      longitude,
      assets!inner(asset_number, category),
      profiles(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recent scans: ${error.message}`);
  }

  return (data || []).map((scan: any) => ({
    id: scan.id,
    assetId: scan.asset_id,
    assetNumber: scan.assets?.asset_number || 'Unknown',
    assetCategory: scan.assets?.category || 'unknown',
    scanType: scan.scan_type,
    scannedAt: scan.created_at,
    scannedBy: scan.scanned_by,
    scannerName: scan.profiles?.full_name || null,
    latitude: scan.latitude,
    longitude: scan.longitude,
  }));
}

/**
 * Fetch outstanding assets (not scanned in X days)
 */
async function fetchOutstandingAssets(days: number): Promise<OutstandingAsset[]> {
  const supabase = getSupabase();
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get all assets with their last scan
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select(`
      id,
      asset_number,
      category,
      status,
      last_latitude,
      last_longitude,
      last_location_updated_at
    `)
    .is('deleted_at', null)
    .in('status', ['active', 'maintenance']); // Only check active assets

  if (assetsError) {
    throw new Error(`Failed to fetch outstanding assets: ${assetsError.message}`);
  }

  // For each asset, get the last scan date
  const outstanding: OutstandingAsset[] = [];

  for (const asset of assets || []) {
    const { data: lastScan } = await supabase
      .from('scan_events')
      .select('created_at')
      .eq('asset_id', asset.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const lastScanDate = lastScan?.created_at || null;
    const lastScanTime = lastScanDate ? new Date(lastScanDate).getTime() : 0;
    const daysSince = lastScanDate
      ? Math.floor((Date.now() - lastScanTime) / (1000 * 60 * 60 * 24))
      : null;

    // Include if no scan or scan is older than cutoff
    if (!lastScanDate || lastScanTime < cutoffDate.getTime()) {
      outstanding.push({
        id: asset.id,
        assetNumber: asset.asset_number,
        category: asset.category,
        status: asset.status,
        lastScanDate,
        daysSinceLastScan: daysSince,
        lastLocation: asset.last_latitude && asset.last_longitude
          ? {
              latitude: asset.last_latitude,
              longitude: asset.last_longitude,
            }
          : null,
      });
    }
  }

  // Sort by days since last scan (descending)
  return outstanding.sort((a, b) => {
    if (a.daysSinceLastScan === null) return -1;
    if (b.daysSinceLastScan === null) return 1;
    return b.daysSinceLastScan - a.daysSinceLastScan;
  });
}

/**
 * Fetch asset locations for map
 */
async function fetchAssetLocations(): Promise<AssetLocation[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('assets')
    .select(`
      id,
      asset_number,
      category,
      subtype,
      status,
      last_latitude,
      last_longitude,
      last_location_accuracy,
      last_location_updated_at
    `)
    .is('deleted_at', null)
    .not('last_latitude', 'is', null)
    .not('last_longitude', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch asset locations: ${error.message}`);
  }

  return (data || []).map((asset) => ({
    id: asset.id,
    assetNumber: asset.asset_number,
    category: asset.category,
    subtype: asset.subtype,
    status: asset.status,
    latitude: asset.last_latitude!,
    longitude: asset.last_longitude!,
    accuracy: asset.last_location_accuracy,
    lastUpdated: asset.last_location_updated_at || '',
  }));
}

/**
 * Hook to fetch fleet statistics
 */
export function useFleetStatistics(enabled: boolean = true) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.statistics(),
    queryFn: fetchFleetStatistics,
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
    queryFn: () => fetchRecentScans(limit),
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
    queryFn: () => fetchOutstandingAssets(days),
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
    queryFn: fetchAssetLocations,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 3 * 60 * 1000, // Refetch every 3 minutes
    enabled,
  });
}

/**
 * Hook for real-time fleet updates via Supabase subscriptions
 */
export function useFleetRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = getSupabase();

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
      scanSubscription.unsubscribe();
      assetSubscription.unsubscribe();
    };
  }, [queryClient]);
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
  if (enableRealtime) {
    useFleetRealtime();
  }

  return {
    statistics,
    recentScans,
    outstandingAssets,
    assetLocations,
    isLoading: statistics.isLoading || recentScans.isLoading || outstandingAssets.isLoading || assetLocations.isLoading,
    isError: statistics.isError || recentScans.isError || outstandingAssets.isError || assetLocations.isError,
    error: statistics.error || recentScans.error || outstandingAssets.error || assetLocations.error,
  };
}
