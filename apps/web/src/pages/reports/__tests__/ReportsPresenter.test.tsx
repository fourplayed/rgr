/**
 * ReportsPresenter — unit tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReportsPresenterProps } from '../ReportsPresenter';

// ── Mock all chart components ─────────────────────────────────────────────────
vi.mock('../components/ScanFrequencyChart', () => ({
  ScanFrequencyChart: () => <div data-testid="scan-freq-chart" />,
}));
vi.mock('../components/AssetUtilizationChart', () => ({
  AssetUtilizationChart: () => <div data-testid="asset-util-chart" />,
}));
vi.mock('../components/HazardTrendsChart', () => ({
  HazardTrendsChart: () => <div data-testid="hazard-trends-chart" />,
}));
vi.mock('../components/TimeBetweenScansChart', () => ({
  TimeBetweenScansChart: () => <div data-testid="time-between-scans-chart" />,
}));
vi.mock('../components/OutstandingAssetsTable', () => ({
  OutstandingAssetsTable: ({ onExportCsv }: { onExportCsv?: () => void }) => (
    <div data-testid="outstanding-assets-table">
      {onExportCsv && (
        <button type="button" onClick={onExportCsv} data-testid="export-csv-btn">
          Export CSV
        </button>
      )}
    </div>
  ),
}));
vi.mock('../components/TimeRangePicker', () => ({
  TimeRangePicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div data-testid="time-range-picker" data-value={value}>
      <button type="button" onClick={() => onChange('7d')}>
        7d
      </button>
    </div>
  ),
}));

import { ReportsPresenter } from '../ReportsPresenter';

// ── Sample props ──────────────────────────────────────────────────────────────
const defaultProps: ReportsPresenterProps = {
  timeRange: '30d',
  onTimeRangeChange: vi.fn(),
  scanFrequency: [],
  scanFrequencyLoading: false,
  assetUtilization: undefined,
  assetUtilizationLoading: false,
  hazardTrends: [],
  hazardTrendsLoading: false,
  timeBetweenScans: [],
  timeBetweenScansLoading: false,
  outstandingAssets: [],
  outstandingAssetsLoading: false,
  onExportCsv: vi.fn(),
};

describe('ReportsPresenter', () => {
  it('renders the page title "Reports & Analytics"', () => {
    render(<ReportsPresenter {...defaultProps} />);
    expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
  });

  it('renders TimeRangePicker with the correct value', () => {
    render(<ReportsPresenter {...defaultProps} />);
    const picker = screen.getByTestId('time-range-picker');
    expect(picker).toBeInTheDocument();
    expect(picker).toHaveAttribute('data-value', '30d');
  });

  it('renders the ScanFrequencyChart', () => {
    render(<ReportsPresenter {...defaultProps} />);
    expect(screen.getByTestId('scan-freq-chart')).toBeInTheDocument();
  });

  it('renders the AssetUtilizationChart', () => {
    render(<ReportsPresenter {...defaultProps} />);
    expect(screen.getByTestId('asset-util-chart')).toBeInTheDocument();
  });

  it('renders the HazardTrendsChart', () => {
    render(<ReportsPresenter {...defaultProps} />);
    expect(screen.getByTestId('hazard-trends-chart')).toBeInTheDocument();
  });

  it('renders the TimeBetweenScansChart', () => {
    render(<ReportsPresenter {...defaultProps} />);
    expect(screen.getByTestId('time-between-scans-chart')).toBeInTheDocument();
  });

  it('renders the OutstandingAssetsTable', () => {
    render(<ReportsPresenter {...defaultProps} />);
    expect(screen.getByTestId('outstanding-assets-table')).toBeInTheDocument();
  });

  it('calls onExportCsv when the export button is triggered', () => {
    const onExportCsv = vi.fn();
    render(<ReportsPresenter {...defaultProps} onExportCsv={onExportCsv} />);
    fireEvent.click(screen.getByTestId('export-csv-btn'));
    expect(onExportCsv).toHaveBeenCalledOnce();
  });

  it('calls onTimeRangeChange when TimeRangePicker changes', () => {
    const onTimeRangeChange = vi.fn();
    render(<ReportsPresenter {...defaultProps} onTimeRangeChange={onTimeRangeChange} />);
    fireEvent.click(screen.getByText('7d'));
    expect(onTimeRangeChange).toHaveBeenCalledWith('7d');
  });

  it('renders with different timeRange prop', () => {
    render(<ReportsPresenter {...defaultProps} timeRange="90d" />);
    const picker = screen.getByTestId('time-range-picker');
    expect(picker).toHaveAttribute('data-value', '90d');
  });
});
