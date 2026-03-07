import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';

// ── Interfaces ──

export interface FleetStatistics {
  totalAssets: number;
  activeAssets: number;
  inMaintenance: number;
  outOfService: number;
  trailerCount: number;
  dollyCount: number;
}

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
}

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
  depot?: string | null;
}

// ── Join Row Types ──

interface DashboardScanRow {
  id: string;
  asset_id: string;
  scan_type: string;
  created_at: string;
  scanned_by: string | null;
  latitude: number | null;
  longitude: number | null;
  assets: { asset_number: string; category: string };
  profiles: { full_name: string } | null;
}

interface AssetLocationRow {
  id: string;
  asset_number: string;
  category: string;
  subtype: string | null;
  status: string;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_accuracy: number | null;
  last_location_updated_at: string | null;
}

// ── Fleet Statistics ──

/**
 * Fetch fleet statistics via RPC with client-side fallback.
 */
export async function getFleetStatistics(): Promise<ServiceResult<FleetStatistics>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_fleet_statistics');

  if (!error && data) {
    const stats = data as {
      total_assets: number;
      serviced: number;
      maintenance: number;
      out_of_service: number;
      trailer_count: number;
      dolly_count: number;
    };

    return {
      success: true,
      data: {
        totalAssets: stats.total_assets,
        activeAssets: stats.serviced,
        inMaintenance: stats.maintenance,
        outOfService: stats.out_of_service,
        trailerCount: stats.trailer_count,
        dollyCount: stats.dolly_count,
      },
      error: null,
    };
  }

  // Fallback: client-side aggregation if RPC doesn't exist
  const { data: assets, error: fallbackError } = await supabase
    .from('assets')
    .select('status, category')
    .is('deleted_at', null);

  if (fallbackError) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch fleet statistics: ${fallbackError.message}`,
    };
  }

  return {
    success: true,
    data: {
      totalAssets: assets.length,
      activeAssets: assets.filter((a) => a.status === 'serviced').length,
      inMaintenance: assets.filter((a) => a.status === 'maintenance').length,
      outOfService: assets.filter((a) => a.status === 'out_of_service').length,
      trailerCount: assets.filter((a) => a.category === 'trailer').length,
      dollyCount: assets.filter((a) => a.category === 'dolly').length,
    },
    error: null,
  };
}

// ── Recent Dashboard Scans ──

/**
 * Fetch recent scans with scanner name and asset info for dashboard display.
 * Named getRecentDashboardScans to avoid collision with getRecentScans in assets.ts.
 */
export async function getRecentDashboardScans(
  limit: number = 20
): Promise<ServiceResult<RecentScan[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('scan_events')
    .select(
      `
      id,
      asset_id,
      scan_type,
      created_at,
      scanned_by,
      latitude,
      longitude,
      assets!inner(asset_number, category),
      profiles(full_name)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { success: false, data: null, error: `Failed to fetch recent scans: ${error.message}` };
  }

  const scans = (data || []).map((scan: DashboardScanRow) => ({
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

  return { success: true, data: scans, error: null };
}

// ── Outstanding Assets ──

/**
 * Fetch assets not scanned in the given number of days.
 * Uses last_location_updated_at maintained by a DB trigger from scan_events.
 */
export async function getOutstandingAssets(
  days: number = 30
): Promise<ServiceResult<OutstandingAsset[]>> {
  const supabase = getSupabaseClient();
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const { data: assets, error } = await supabase
    .from('assets')
    .select(
      `
      id,
      asset_number,
      category,
      status,
      last_latitude,
      last_longitude,
      last_location_updated_at
    `
    )
    .is('deleted_at', null)
    .in('status', ['serviced', 'maintenance'])
    .or(`last_location_updated_at.lt.${cutoffDate.toISOString()},last_location_updated_at.is.null`);

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch outstanding assets: ${error.message}`,
    };
  }

  const outstanding: OutstandingAsset[] = (assets || []).map((asset) => {
    const lastScanDate = asset.last_location_updated_at || null;
    const lastScanTime = lastScanDate ? new Date(lastScanDate).getTime() : 0;
    const daysSince = lastScanDate
      ? Math.floor((Date.now() - lastScanTime) / (1000 * 60 * 60 * 24))
      : null;

    return {
      id: asset.id,
      assetNumber: asset.asset_number,
      category: asset.category,
      status: asset.status,
      lastScanDate,
      daysSinceLastScan: daysSince,
      lastLocation:
        asset.last_latitude && asset.last_longitude
          ? { latitude: asset.last_latitude, longitude: asset.last_longitude }
          : null,
    };
  });

  // Sort by days since last scan (descending), nulls first
  return {
    success: true,
    data: outstanding.sort((a, b) => {
      if (a.daysSinceLastScan === null) return -1;
      if (b.daysSinceLastScan === null) return 1;
      return b.daysSinceLastScan - a.daysSinceLastScan;
    }),
    error: null,
  };
}

// ── Asset Locations ──

/**
 * Fetch all assets with location data for map display.
 */
export async function getAssetLocations(): Promise<ServiceResult<AssetLocation[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('assets')
    .select(
      `
      id,
      asset_number,
      category,
      subtype,
      status,
      last_latitude,
      last_longitude,
      last_location_accuracy,
      last_location_updated_at
    `
    )
    .is('deleted_at', null)
    .not('last_latitude', 'is', null)
    .not('last_longitude', 'is', null);

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch asset locations: ${error.message}`,
    };
  }

  const locations = (data || []).map((asset: AssetLocationRow) => ({
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

  return { success: true, data: locations, error: null };
}
