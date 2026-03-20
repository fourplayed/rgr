/**
 * useReportsLogic — Business logic hook for the Reports & Analytics page
 *
 * Manages time range state, calls analytics hooks, and provides CSV export.
 */
import { useState, useCallback } from 'react';
import {
  useScanFrequency,
  useAssetUtilization,
  useHazardTrends,
  useTimeBetweenScans,
  useOutstandingAnalyticsAssets,
} from '@/hooks/useAnalytics';
import type { AnalyticsTimeRange } from '@/hooks/useAnalytics';
import type {
  ScanFrequencyPoint,
  AssetUtilizationSnapshot,
  HazardTrendPoint,
  TimeBetweenScansPoint,
  AnalyticsOutstandingAsset,
} from '@rgr/shared';

export type { AnalyticsTimeRange };

export interface ReportsLogicResult {
  // Time range
  timeRange: AnalyticsTimeRange;
  setTimeRange: (range: AnalyticsTimeRange) => void;

  // Scan frequency
  scanFrequency: ScanFrequencyPoint[];
  scanFrequencyLoading: boolean;

  // Asset utilization
  assetUtilization: AssetUtilizationSnapshot | undefined;
  assetUtilizationLoading: boolean;

  // Hazard trends
  hazardTrends: HazardTrendPoint[];
  hazardTrendsLoading: boolean;

  // Time between scans
  timeBetweenScans: TimeBetweenScansPoint[];
  timeBetweenScansLoading: boolean;

  // Outstanding assets
  outstandingAssets: AnalyticsOutstandingAsset[];
  outstandingAssetsLoading: boolean;

  // Handlers
  handleExportCsv: (data: AnalyticsOutstandingAsset[]) => void;
}

export function useReportsLogic(): ReportsLogicResult {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');

  const { data: scanFrequency = [], isLoading: scanFrequencyLoading } = useScanFrequency(timeRange);
  const { data: assetUtilization, isLoading: assetUtilizationLoading } = useAssetUtilization();
  const { data: hazardTrends = [], isLoading: hazardTrendsLoading } = useHazardTrends(timeRange);
  const { data: timeBetweenScans = [], isLoading: timeBetweenScansLoading } =
    useTimeBetweenScans(timeRange);
  const { data: outstandingAssets = [], isLoading: outstandingAssetsLoading } =
    useOutstandingAnalyticsAssets();

  const handleExportCsv = useCallback((data: AnalyticsOutstandingAsset[]) => {
    const headers = ['Asset Number', 'Category', 'Status', 'Last Scanned', 'Days Overdue'];
    const rows = data.map((a) => [
      a.assetNumber,
      a.category,
      a.status,
      a.lastScanDate ?? 'Never',
      a.daysSinceLastScan?.toString() ?? 'N/A',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'outstanding-assets.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    timeRange,
    setTimeRange,
    scanFrequency,
    scanFrequencyLoading,
    assetUtilization,
    assetUtilizationLoading,
    hazardTrends,
    hazardTrendsLoading,
    timeBetweenScans,
    timeBetweenScansLoading,
    outstandingAssets,
    outstandingAssetsLoading,
    handleExportCsv,
  };
}
