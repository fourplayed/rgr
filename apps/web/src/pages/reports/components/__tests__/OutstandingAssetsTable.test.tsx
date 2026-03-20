/**
 * OutstandingAssetsTable component tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OutstandingAssetsTable } from '../OutstandingAssetsTable';
import type { AnalyticsOutstandingAsset } from '@/services/analyticsService';

const sampleData: AnalyticsOutstandingAsset[] = [
  {
    id: '1',
    assetNumber: 'ASSET-001',
    category: 'Forklift',
    status: 'active',
    lastScanDate: '2026-01-01T00:00:00Z',
    daysSinceLastScan: 78,
    lastLocation: null,
  },
  {
    id: '2',
    assetNumber: 'ASSET-002',
    category: 'Truck',
    status: 'idle',
    lastScanDate: null,
    daysSinceLastScan: null,
    lastLocation: null,
  },
  {
    id: '3',
    assetNumber: 'ASSET-003',
    category: 'Crane',
    status: 'maintenance',
    lastScanDate: '2026-02-15T00:00:00Z',
    daysSinceLastScan: 33,
    lastLocation: null,
  },
];

describe('OutstandingAssetsTable', () => {
  it('renders asset rows with valid data', () => {
    render(<OutstandingAssetsTable data={sampleData} />);
    expect(screen.getByText('ASSET-001')).toBeInTheDocument();
    expect(screen.getByText('ASSET-002')).toBeInTheDocument();
    expect(screen.getByText('ASSET-003')).toBeInTheDocument();
  });

  it('shows "Never" for null lastScanDate', () => {
    render(<OutstandingAssetsTable data={sampleData} />);
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<OutstandingAssetsTable data={[]} isLoading />);
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
  });

  it('does not show skeleton when not loading', () => {
    render(<OutstandingAssetsTable data={sampleData} />);
    expect(screen.queryByTestId('table-skeleton')).not.toBeInTheDocument();
  });

  it('shows empty state when data is empty and not loading', () => {
    render(<OutstandingAssetsTable data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('renders Export CSV button when onExportCsv is provided', () => {
    const onExportCsv = vi.fn();
    render(<OutstandingAssetsTable data={sampleData} onExportCsv={onExportCsv} />);
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('does not render Export CSV button when onExportCsv is not provided', () => {
    render(<OutstandingAssetsTable data={sampleData} />);
    expect(screen.queryByRole('button', { name: /export csv/i })).not.toBeInTheDocument();
  });

  it('calls onExportCsv when the Export CSV button is clicked', async () => {
    const user = userEvent.setup();
    const onExportCsv = vi.fn();
    render(<OutstandingAssetsTable data={sampleData} onExportCsv={onExportCsv} />);
    await user.click(screen.getByRole('button', { name: /export csv/i }));
    expect(onExportCsv).toHaveBeenCalledTimes(1);
  });

  it('renders table column headers', () => {
    render(<OutstandingAssetsTable data={sampleData} />);
    expect(screen.getByText(/asset number/i)).toBeInTheDocument();
    expect(screen.getByText(/category/i)).toBeInTheDocument();
    expect(screen.getByText(/status/i)).toBeInTheDocument();
    expect(screen.getByText(/last scanned/i)).toBeInTheDocument();
    expect(screen.getByText(/days overdue/i)).toBeInTheDocument();
  });

  it('sorts rows with longest overdue first (null daysSinceLastScan first)', () => {
    render(<OutstandingAssetsTable data={sampleData} />);
    const rows = screen.getAllByRole('row');
    // First data row (index 1, skip header) should be the asset with null daysSinceLastScan
    expect(rows[1]).toHaveTextContent('ASSET-002');
    // Second row should be the 78-day overdue asset
    expect(rows[2]).toHaveTextContent('ASSET-001');
    // Third row should be the 33-day overdue asset
    expect(rows[3]).toHaveTextContent('ASSET-003');
  });

  it('renders without errors', () => {
    expect(() => render(<OutstandingAssetsTable data={sampleData} />)).not.toThrow();
  });
});
