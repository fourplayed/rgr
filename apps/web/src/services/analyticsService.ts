/**
 * analyticsService - Analytics data types and service functions
 *
 * TODO: Implement actual analytics service with Supabase queries.
 * This is a stub file providing type exports consumed by:
 * - AnalyticsCharts.tsx (ScanFrequencyData, AssetUtilizationData, TimeBetweenScansData, HazardTrendData)
 * - useFleetData.ts (AnalyticsTimeRange)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Time range filter for analytics queries */
export type AnalyticsTimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

/** Data point for scan frequency chart (bar/line chart) */
export interface ScanFrequencyData {
  /** Display label for the x-axis (e.g., date string) */
  label: string;
  /** Number of scans in this period */
  count: number;
}

/** Data point for asset utilization pie chart */
export interface AssetUtilizationData {
  /** Status category name (e.g., "Serviced", "In Maintenance") */
  status: string;
  /** Number of assets in this status */
  count: number;
  /** Percentage of total assets */
  percentage: number;
  /** Display color for the pie slice */
  color: string;
}

/** Data point for time-between-scans histogram */
export interface TimeBetweenScansData {
  /** Bucket range label (e.g., "0-7 days", "8-14 days") */
  range: string;
  /** Number of assets in this bucket */
  count: number;
}

/** Data point for hazard detection trend line chart */
export interface HazardTrendData {
  /** ISO date string for the x-axis */
  date: string;
  /** Total hazard count for this date */
  total: number;
  /** Count of critical-severity hazards */
  criticalCount: number;
  /** Count of high-severity hazards */
  highCount: number;
  /** Count of medium-severity hazards */
  mediumCount: number;
  /** Count of low-severity hazards */
  lowCount: number;
}
