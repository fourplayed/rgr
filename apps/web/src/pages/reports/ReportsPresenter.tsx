/**
 * ReportsPresenter — pure display component for the Reports & Analytics page
 *
 * Receives all data and handlers as props — no data fetching here.
 * Layout:
 *   - Page title + TimeRangePicker header
 *   - 2-column grid of chart cards
 *   - Full-width OutstandingAssetsTable
 */
import React from 'react';
import type {
  ScanFrequencyPoint,
  AssetUtilizationSnapshot,
  HazardTrendPoint,
  TimeBetweenScansPoint,
  AnalyticsOutstandingAsset,
} from '@rgr/shared';
import type { AnalyticsTimeRange } from '@/hooks/useAnalytics';
import { ScanFrequencyChart } from './components/ScanFrequencyChart';
import { AssetUtilizationChart } from './components/AssetUtilizationChart';
import { HazardTrendsChart } from './components/HazardTrendsChart';
import { TimeBetweenScansChart } from './components/TimeBetweenScansChart';
import { OutstandingAssetsTable } from './components/OutstandingAssetsTable';
import { TimeRangePicker } from './components/TimeRangePicker';

export interface ReportsPresenterProps {
  // Time range
  timeRange: AnalyticsTimeRange;
  onTimeRangeChange: (range: AnalyticsTimeRange) => void;

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
  onExportCsv: () => void;
}

/** Glassmorphic card wrapper for chart sections */
const CARD_STYLE: React.CSSProperties = {
  background: 'rgba(0, 0, 48, 0.45)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  padding: '20px',
};

const CARD_TITLE_STYLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(235, 235, 235, 0.6)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '16px',
};

export function ReportsPresenter({
  timeRange,
  onTimeRangeChange,
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
  onExportCsv,
}: ReportsPresenterProps) {
  return (
    <div
      className="flex flex-col gap-6 pt-4 pb-8 overflow-y-auto scrollbar-hidden"
      style={{ width: 'calc(100% - 48px)', maxWidth: '1360px', margin: '0 auto' }}
    >
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'rgba(235, 235, 235, 0.95)',
            letterSpacing: '-0.01em',
          }}
        >
          Reports &amp; Analytics
        </h1>
        <TimeRangePicker value={timeRange} onChange={onTimeRangeChange} />
      </div>

      {/* 2-column chart grid */}
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
      >
        {/* Scan Frequency */}
        <div style={CARD_STYLE}>
          <p style={CARD_TITLE_STYLE}>Scan Frequency</p>
          <ScanFrequencyChart data={scanFrequency} isLoading={scanFrequencyLoading} />
        </div>

        {/* Asset Utilization */}
        <div style={CARD_STYLE}>
          <p style={CARD_TITLE_STYLE}>Asset Utilization</p>
          <AssetUtilizationChart data={assetUtilization} isLoading={assetUtilizationLoading} />
        </div>

        {/* Hazard Trends */}
        <div style={CARD_STYLE}>
          <p style={CARD_TITLE_STYLE}>Hazard Trends</p>
          <HazardTrendsChart data={hazardTrends} isLoading={hazardTrendsLoading} />
        </div>

        {/* Time Between Scans */}
        <div style={CARD_STYLE}>
          <p style={CARD_TITLE_STYLE}>Time Between Scans</p>
          <TimeBetweenScansChart data={timeBetweenScans} isLoading={timeBetweenScansLoading} />
        </div>
      </div>

      {/* Outstanding assets — full width */}
      <div style={CARD_STYLE}>
        <p style={CARD_TITLE_STYLE}>Outstanding Assets</p>
        <OutstandingAssetsTable
          data={outstandingAssets}
          isLoading={outstandingAssetsLoading}
          onExportCsv={onExportCsv}
        />
      </div>
    </div>
  );
}

export default ReportsPresenter;
