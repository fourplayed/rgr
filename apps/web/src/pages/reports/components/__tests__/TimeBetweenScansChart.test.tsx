/**
 * TimeBetweenScansChart component tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimeBetweenScansChart } from '../TimeBetweenScansChart';
import type { TimeBetweenScansPoint } from '@/services/analyticsService';

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

const sampleData: TimeBetweenScansPoint[] = [
  { bucketDays: 0, count: 5 },
  { bucketDays: 7, count: 12 },
  { bucketDays: 14, count: 8 },
  { bucketDays: 30, count: 3 },
];

describe('TimeBetweenScansChart', () => {
  it('renders the chart container with valid data', () => {
    render(<TimeBetweenScansChart data={sampleData} />);
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<TimeBetweenScansChart data={[]} isLoading />);
    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-container')).not.toBeInTheDocument();
  });

  it('does not show skeleton when not loading', () => {
    render(<TimeBetweenScansChart data={sampleData} />);
    expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
  });

  it('shows empty state when data is empty and not loading', () => {
    render(<TimeBetweenScansChart data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('does not show empty state when data is present', () => {
    render(<TimeBetweenScansChart data={sampleData} />);
    expect(screen.queryByText(/no data available/i)).not.toBeInTheDocument();
  });

  it('renders without errors with valid data', () => {
    expect(() => render(<TimeBetweenScansChart data={sampleData} />)).not.toThrow();
  });
});
