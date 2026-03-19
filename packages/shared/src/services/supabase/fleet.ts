import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';
import type { AssetCategory, AssetStatus, ScanType } from '../../types/enums';
import { AssetCategorySchema, AssetStatusSchema } from '../../types/enums/AssetEnums';
import { ScanTypeSchema } from '../../types/enums/ScanEnums';
import { safeParseEnum } from '../../utils/safeParseEnum';
import { FleetStatisticsResultSchema } from '../../types/rpcResults';

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
  assetCategory: AssetCategory;
  scanType: ScanType;
  scannedAt: string;
  scannedBy: string | null;
  scannerName: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface OutstandingAsset {
  id: string;
  assetNumber: string;
  category: AssetCategory;
  status: AssetStatus;
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
  category: AssetCategory;
  subtype: string | null;
  status: AssetStatus;
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
 * Fetch fleet statistics via the get_fleet_statistics RPC.
 */
export async function getFleetStatistics(): Promise<ServiceResult<FleetStatistics>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_fleet_statistics');

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch fleet statistics: ${error.message}`,
    };
  }

  const parsed = FleetStatisticsResultSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      data: null,
      error: 'Unexpected RPC response shape for get_fleet_statistics',
    };
  }

  const stats = parsed.data;
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

  const scans: RecentScan[] = (data || []).map((scan: DashboardScanRow) => ({
    id: scan.id,
    assetId: scan.asset_id,
    assetNumber: scan.assets?.asset_number || 'Unknown',
    assetCategory: safeParseEnum(AssetCategorySchema, scan.assets?.category, 'trailer'),
    scanType: safeParseEnum(ScanTypeSchema, scan.scan_type, 'qr_scan'),
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
      category: safeParseEnum(AssetCategorySchema, asset.category, 'trailer'),
      status: safeParseEnum(AssetStatusSchema, asset.status, 'serviced'),
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

  const locations: AssetLocation[] = [];
  for (const asset of data || []) {
    const row = asset as AssetLocationRow;
    if (row.last_latitude != null && row.last_longitude != null) {
      locations.push({
        id: row.id,
        assetNumber: row.asset_number,
        category: safeParseEnum(AssetCategorySchema, row.category, 'trailer'),
        subtype: row.subtype,
        status: safeParseEnum(AssetStatusSchema, row.status, 'serviced'),
        latitude: row.last_latitude,
        longitude: row.last_longitude,
        accuracy: row.last_location_accuracy,
        lastUpdated: row.last_location_updated_at || '',
      });
    }
  }

  return { success: true, data: locations, error: null };
}
