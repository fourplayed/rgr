import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';

// ── Types ──

/** Time range for analytics queries */
export type AnalyticsTimeRange = '7d' | '30d' | '90d' | '1y';

export interface ScanFrequencyPoint {
  date: string; // ISO date string 'YYYY-MM-DD'
  count: number; // scans that day
}

export interface AssetUtilizationSnapshot {
  active: number;      // serviced assets
  idle: number;        // out_of_service assets
  maintenance: number; // maintenance assets
  retired: number;     // not currently a DB status; always 0
  total: number;
}

export interface HazardTrendPoint {
  date: string; // ISO date string
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface TimeBetweenScansPoint {
  bucketDays: number; // e.g. 0, 7, 14, 30, 60, 90
  count: number;
}

export interface AnalyticsOutstandingAsset {
  id: string;
  assetNumber: string;          // maps from DB column 'asset_number'
  category: string;
  status: string;
  lastScanDate: string | null;  // maps from DB 'last_location_updated_at'
  daysSinceLastScan: number | null;
  lastLocation: string | null;  // not available in DB; always null
}

// ── Helpers ──

function getCutoffDate(timeRange: AnalyticsTimeRange): string {
  const now = new Date();
  const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  const cutoff = new Date(now.getTime() - days[timeRange] * 24 * 60 * 60 * 1000);
  return cutoff.toISOString();
}

function toDateString(isoString: string): string {
  return isoString.slice(0, 10); // 'YYYY-MM-DD'
}

// ── getScanFrequency ──

/**
 * Scan frequency: scans per day grouped by date.
 * Uses the scan_events table (created_at column).
 */
export async function getScanFrequency(
  timeRange: AnalyticsTimeRange
): Promise<ServiceResult<ScanFrequencyPoint[]>> {
  const supabase = getSupabaseClient();
  const cutoff = getCutoffDate(timeRange);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('scan_events')
    .select('created_at')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true });

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch scan frequency: ${error.message}`,
    };
  }

  // Aggregate by date in JavaScript
  const countsByDate = new Map<string, number>();
  for (const row of (data as Array<{ created_at: string }>) || []) {
    const date = toDateString(row.created_at);
    countsByDate.set(date, (countsByDate.get(date) ?? 0) + 1);
  }

  const points: ScanFrequencyPoint[] = Array.from(countsByDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { success: true, data: points, error: null };
}

// ── getAssetUtilization ──

/**
 * Asset utilization: current snapshot of asset counts by status.
 * DB statuses: serviced → active, maintenance → maintenance, out_of_service → idle.
 */
export async function getAssetUtilization(): Promise<ServiceResult<AssetUtilizationSnapshot>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from('assets').select('status');

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch asset utilization: ${error.message}`,
    };
  }

  const rows = data || [];
  const snapshot: AssetUtilizationSnapshot = {
    active: rows.filter((r) => r.status === 'serviced').length,
    idle: rows.filter((r) => r.status === 'out_of_service').length,
    maintenance: rows.filter((r) => r.status === 'maintenance').length,
    retired: 0, // not a current DB status
    total: rows.length,
  };

  return { success: true, data: snapshot, error: null };
}

// ── getHazardTrends ──

/**
 * Hazard trends: alerts over time by severity.
 */
export async function getHazardTrends(
  timeRange: AnalyticsTimeRange
): Promise<ServiceResult<HazardTrendPoint[]>> {
  const supabase = getSupabaseClient();
  const cutoff = getCutoffDate(timeRange);

  const { data, error } = await supabase
    .from('hazard_alerts')
    .select('created_at, severity')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true });

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch hazard trends: ${error.message}`,
    };
  }

  // Aggregate by date + severity in JavaScript
  const byDate = new Map<
    string,
    { critical: number; high: number; medium: number; low: number }
  >();

  for (const row of data || []) {
    const date = toDateString(row.created_at as string);
    if (!byDate.has(date)) {
      byDate.set(date, { critical: 0, high: 0, medium: 0, low: 0 });
    }
    const entry = byDate.get(date)!;
    const sev = row.severity as string;
    if (sev === 'critical') entry.critical++;
    else if (sev === 'high') entry.high++;
    else if (sev === 'medium') entry.medium++;
    else if (sev === 'low') entry.low++;
  }

  const points: HazardTrendPoint[] = Array.from(byDate.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { success: true, data: points, error: null };
}

// ── getTimeBetweenScans ──

const SCAN_BUCKETS: Array<{ bucketDays: number; min: number; max: number }> = [
  { bucketDays: 0, min: 0, max: 7 },
  { bucketDays: 7, min: 7, max: 14 },
  { bucketDays: 14, min: 14, max: 30 },
  { bucketDays: 30, min: 30, max: 60 },
  { bucketDays: 60, min: 60, max: 90 },
  { bucketDays: 90, min: 90, max: Infinity },
];

/**
 * Time between scans: histogram of how long assets go unscanned.
 * Uses last_location_updated_at from assets table (maintained by scan trigger).
 */
export async function getTimeBetweenScans(
  timeRange: AnalyticsTimeRange
): Promise<ServiceResult<TimeBetweenScansPoint[]>> {
  const supabase = getSupabaseClient();

  // timeRange parameter reserved for future date-window filtering
  void timeRange;

  const { data, error } = await supabase
    .from('assets')
    .select('last_location_updated_at')
    .not('last_location_updated_at', 'is', null);

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch time between scans: ${error.message}`,
    };
  }

  const now = Date.now();
  // Initialize count map keyed by bucketDays
  const countMap = new Map<number, number>(SCAN_BUCKETS.map((b) => [b.bucketDays, 0]));

  for (const row of data || []) {
    const lastScan = row.last_location_updated_at as string | null;
    if (!lastScan) continue;
    const daysSince = Math.floor((now - new Date(lastScan).getTime()) / (1000 * 60 * 60 * 24));
    for (const bucket of SCAN_BUCKETS) {
      if (daysSince >= bucket.min && daysSince < bucket.max) {
        countMap.set(bucket.bucketDays, (countMap.get(bucket.bucketDays) ?? 0) + 1);
        break;
      }
    }
  }

  const points: TimeBetweenScansPoint[] = SCAN_BUCKETS.map((b) => ({
    bucketDays: b.bucketDays,
    count: countMap.get(b.bucketDays) ?? 0,
  }));

  return { success: true, data: points, error: null };
}

// ── getOutstandingAnalyticsAssets ──

/**
 * Outstanding analytics assets: assets not scanned in `days` days, sorted oldest first.
 * Named getOutstandingAnalyticsAssets to avoid collision with fleet.ts getOutstandingAssets.
 * Uses last_location_updated_at (maintained by DB trigger from scan_events).
 */
export async function getOutstandingAnalyticsAssets(
  days: number = 30
): Promise<ServiceResult<AnalyticsOutstandingAsset[]>> {
  const supabase = getSupabaseClient();
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('assets')
    .select('id, asset_number, category, status, last_location_updated_at')
    .or(`last_location_updated_at.is.null,last_location_updated_at.lt.${cutoffDate}`)
    .order('last_location_updated_at', { ascending: true });

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch outstanding assets: ${error.message}`,
    };
  }

  const now = Date.now();
  const assets: AnalyticsOutstandingAsset[] = (data || []).map((row) => {
    const lastScanDate = row.last_location_updated_at ?? null;
    const daysSinceLastScan = lastScanDate
      ? Math.floor((now - new Date(lastScanDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      id: row.id,
      assetNumber: row.asset_number,
      category: row.category as string,
      status: row.status as string,
      lastScanDate,
      daysSinceLastScan,
      lastLocation: null, // no string location column in DB schema
    };
  });

  return { success: true, data: assets, error: null };
}
