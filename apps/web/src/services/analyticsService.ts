/**
 * analyticsService — Re-export shim for backwards compatibility.
 *
 * All analytics logic lives in packages/shared/src/services/supabase/analytics.ts
 * The old stub types (ScanFrequencyData, AssetUtilizationData, etc.) are kept as
 * local aliases so existing consumers (AnalyticsCharts.tsx, useFleetData.ts) are
 * not broken while the new canonical types from @rgr/shared are also re-exported.
 */

// ── Canonical types from @rgr/shared ─────────────────────────────────────────

export type {
  AnalyticsTimeRange,
  ScanFrequencyPoint,
  AssetUtilizationSnapshot,
  HazardTrendPoint,
  TimeBetweenScansPoint,
  AnalyticsOutstandingAsset,
} from '@rgr/shared';

export {
  getScanFrequency,
  getAssetUtilization,
  getHazardTrends,
  getTimeBetweenScans,
  getOutstandingAnalyticsAssets,
} from '@rgr/shared';

// ── Legacy type aliases (kept for AnalyticsCharts.tsx compatibility) ──────────

/** @deprecated Use ScanFrequencyPoint from @rgr/shared */
export interface ScanFrequencyData {
  label: string;
  count: number;
}

/** @deprecated Use AssetUtilizationSnapshot from @rgr/shared */
export interface AssetUtilizationData {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

/** @deprecated Use TimeBetweenScansPoint from @rgr/shared */
export interface TimeBetweenScansData {
  range: string;
  count: number;
}

/** @deprecated Use HazardTrendPoint from @rgr/shared */
export interface HazardTrendData {
  date: string;
  total: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}
