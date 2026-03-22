/**
 * AssetUtilizationChart component tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssetUtilizationChart } from '../AssetUtilizationChart';
import type { AssetUtilizationSnapshot } from '@/services/analyticsService';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  Line: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const sampleData: AssetUtilizationSnapshot = {
  active: 50,
  idle: 20,
  maintenance: 10,
  retired: 0,
  total: 80,
};

describe('AssetUtilizationChart', () => {
  it('renders the chart container with valid data', () => {
    render(<AssetUtilizationChart data={sampleData} />);
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<AssetUtilizationChart data={undefined} isLoading />);
    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-container')).not.toBeInTheDocument();
  });

  it('does not show skeleton when not loading', () => {
    render(<AssetUtilizationChart data={sampleData} />);
    expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
  });

  it('shows empty state when data is undefined and not loading', () => {
    render(<AssetUtilizationChart data={undefined} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('renders without errors with valid data', () => {
    expect(() => render(<AssetUtilizationChart data={sampleData} />)).not.toThrow();
  });

  it('does not show retired segment when retired is 0', () => {
    render(<AssetUtilizationChart data={sampleData} />);
    // retired = 0, so it should not be shown as a segment label
    expect(screen.queryByText(/retired/i)).not.toBeInTheDocument();
  });

  it('shows retired segment when retired count > 0', () => {
    const dataWithRetired: AssetUtilizationSnapshot = { ...sampleData, retired: 5, total: 85 };
    render(<AssetUtilizationChart data={dataWithRetired} />);
    expect(screen.getByText(/retired/i)).toBeInTheDocument();
  });
});
