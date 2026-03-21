import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';
import type { AssetCategory, AssetStatus, ScanType } from '../../types/enums';
import { AssetCategorySchema, AssetStatusSchema } from '../../types/enums/AssetEnums';
import { ScanTypeSchema } from '../../types/enums/ScanEnums';
import { safeParseEnum } from '../../utils/safeParseEnum';
import { FleetStatisticsResultSchema } from '../../types/rpcResults';
import type { DepotRow } from '../../types/entities/depot';
import { mapRowToDepot } from '../../types/entities/depot';

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
  depots: { name: string } | null;
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
      last_location_updated_at,
      depots:assigned_depot_id ( name )
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
        depot: row.depots?.name ?? null,
      });
    }
  }

  return { success: true, data: locations, error: null };
}

// ── Hazard Clearance Rate ──

/**
 * Returns the global hazard clearance rate as a number 0–100.
 * Clearance = (acknowledged + resolved + dismissed) / total * 100.
 * Returns 100 if there are no alerts (all clear).
 */
export async function getHazardClearanceRate(): Promise<ServiceResult<number>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from('hazard_alerts').select('status');

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch hazard clearance rate: ${error.message}`,
    };
  }

  const rows = (data || []) as Array<{ status: string }>;
  const total = rows.length;

  if (total === 0) {
    return { success: true, data: 100, error: null };
  }

  const cleared = rows.filter((r) => r.status !== 'active').length;
  const rate = Math.round((cleared / total) * 1000) / 10; // 1 decimal place

  return { success: true, data: rate, error: null };
}

// ── Depot Health Scores ──

export interface DepotHealthScoreData {
  depotId: string;
  depotName: string;
  /** % assets scanned in last 30 days */
  scanCompliance: number;
  /** % hazard alerts acknowledged, resolved, or dismissed (not active) for this depot */
  hazardClearance: number;
  /** % assets with no overdue maintenance */
  maintenanceCurrency: number;
  /** Weighted: 40% scan + 40% hazard + 20% maintenance */
  overallScore: number;
}

interface AssetScanRow {
  id: string;
  last_location_updated_at: string | null;
}

interface HazardStatusRow {
  status: string;
}

interface MaintenanceStatusRow {
  id: string;
  status: string;
  due_date: string | null;
}

/**
 * Returns per-depot health score data.
 *
 * NOTE: Uses N+1 queries (3 per depot) for simplicity given typical fleet size.
 * TODO: replace with single aggregate query per metric.
 *
 * Join note: hazard_alerts has no depot_id column — it links to assets via
 * asset_id. We fetch asset IDs for the depot first, then filter hazard_alerts
 * by those asset IDs. Similarly, maintenance_records link to assets via asset_id.
 */
export async function getDepotHealthScores(): Promise<ServiceResult<DepotHealthScoreData[]>> {
  const supabase = getSupabaseClient();

  // 1. Fetch all active depots
  const { data: depotData, error: depotError } = await supabase
    .from('depots')
    .select('*')
    .eq('is_active', true)
    .order('name')
    .limit(200);

  if (depotError) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch depots: ${depotError.message}`,
    };
  }

  const depots = (depotData || []).map((row: DepotRow) => mapRowToDepot(row));
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString();

  const scores: DepotHealthScoreData[] = [];

  for (const depot of depots) {
    // 2. Fetch assets assigned to this depot
    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .select('id, last_location_updated_at')
      .eq('assigned_depot_id', depot.id)
      .is('deleted_at', null);

    if (assetError) {
      return {
        success: false,
        data: null,
        error: `Failed to fetch assets for depot ${depot.id}: ${assetError.message}`,
      };
    }

    const assets = (assetData || []) as AssetScanRow[];
    const totalAssets = assets.length;

    // Scan compliance: % assets scanned in last 30 days
    const scanCompliance =
      totalAssets === 0
        ? 100
        : Math.round(
            (assets.filter(
              (a) =>
                a.last_location_updated_at != null && a.last_location_updated_at >= thirtyDaysAgo
            ).length /
              totalAssets) *
              1000
          ) / 10;

    const depotAssetIds = assets.map((a) => a.id);

    // 3. Fetch hazard alerts for this depot's assets
    // hazard_alerts has asset_id (nullable) linking to assets; no direct depot_id column.
    // TODO: replace with single aggregate query
    let hazardClearance = 100;
    if (depotAssetIds.length > 0) {
      const { data: hazardData, error: hazardError } = await supabase
        .from('hazard_alerts')
        .select('status')
        .in('asset_id', depotAssetIds);

      if (hazardError) {
        return {
          success: false,
          data: null,
          error: `Failed to fetch hazard alerts for depot ${depot.id}: ${hazardError.message}`,
        };
      }

      const hazardRows = (hazardData || []) as HazardStatusRow[];
      const totalHazards = hazardRows.length;
      hazardClearance =
        totalHazards === 0
          ? 100
          : Math.round(
              (hazardRows.filter((h) => h.status !== 'active').length / totalHazards) * 1000
            ) / 10;
    } else {
      hazardClearance = 100; // No assets → no possible hazard alerts → fully cleared
    }

    // 4. Fetch maintenance records for this depot's assets
    // maintenance_records links to assets via asset_id; no direct depot_id column.
    // TODO: replace with single aggregate query
    let maintenanceCurrency = 100;
    if (depotAssetIds.length > 0) {
      const { data: maintData, error: maintError } = await supabase
        .from('maintenance_records')
        .select('id, status, due_date')
        .in('asset_id', depotAssetIds);

      if (maintError) {
        return {
          success: false,
          data: null,
          error: `Failed to fetch maintenance records for depot ${depot.id}: ${maintError.message}`,
        };
      }

      const maintRows = (maintData || []) as MaintenanceStatusRow[];
      const totalMaint = maintRows.length;
      const overdueCount = maintRows.filter(
        (m) => m.status === 'scheduled' && m.due_date != null && m.due_date < today
      ).length;
      maintenanceCurrency =
        totalMaint === 0 ? 100 : Math.round(((totalMaint - overdueCount) / totalMaint) * 1000) / 10;
    } else {
      maintenanceCurrency = 100; // No assets → no maintenance records → fully current
    }

    const overallScore =
      Math.round((scanCompliance * 0.4 + hazardClearance * 0.4 + maintenanceCurrency * 0.2) * 10) /
      10;

    scores.push({
      depotId: depot.id,
      depotName: depot.name,
      scanCompliance,
      hazardClearance,
      maintenanceCurrency,
      overallScore,
    });
  }

  return { success: true, data: scores, error: null };
}
