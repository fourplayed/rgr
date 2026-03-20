/**
 * HazardTrendsChart component tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HazardTrendsChart } from '../HazardTrendsChart';
import type { HazardTrendPoint } from '@/services/analyticsService';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
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

const sampleData: HazardTrendPoint[] = [
  { date: '2026-03-01', critical: 2, high: 4, medium: 6, low: 8 },
  { date: '2026-03-02', critical: 1, high: 3, medium: 5, low: 7 },
];

describe('HazardTrendsChart', () => {
  it('renders the chart container with valid data', () => {
    render(<HazardTrendsChart data={sampleData} />);
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<HazardTrendsChart data={[]} isLoading />);
    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-container')).not.toBeInTheDocument();
  });

  it('does not show skeleton when not loading', () => {
    render(<HazardTrendsChart data={sampleData} />);
    expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
  });

  it('shows empty state when data is empty and not loading', () => {
    render(<HazardTrendsChart data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('does not show empty state when data is present', () => {
    render(<HazardTrendsChart data={sampleData} />);
    expect(screen.queryByText(/no data available/i)).not.toBeInTheDocument();
  });

  it('renders without errors with valid data', () => {
    expect(() => render(<HazardTrendsChart data={sampleData} />)).not.toThrow();
  });
});
