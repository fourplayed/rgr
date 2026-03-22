/**
 * ScanFrequencyChart component tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScanFrequencyChart } from '../ScanFrequencyChart';
import type { ScanFrequencyPoint } from '@/services/analyticsService';

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

const sampleData: ScanFrequencyPoint[] = [
  { date: '2026-03-01', count: 12 },
  { date: '2026-03-02', count: 8 },
  { date: '2026-03-03', count: 15 },
];

describe('ScanFrequencyChart', () => {
  it('renders the chart container with valid data', () => {
    render(<ScanFrequencyChart data={sampleData} />);
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
  });

  it('does not show skeleton when not loading', () => {
    render(<ScanFrequencyChart data={sampleData} />);
    expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<ScanFrequencyChart data={[]} isLoading />);
    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-container')).not.toBeInTheDocument();
  });

  it('shows empty state message when data is empty and not loading', () => {
    render(<ScanFrequencyChart data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('does not show empty state when data is present', () => {
    render(<ScanFrequencyChart data={sampleData} />);
    expect(screen.queryByText(/no data available/i)).not.toBeInTheDocument();
  });

  it('renders without errors with valid data', () => {
    expect(() => render(<ScanFrequencyChart data={sampleData} />)).not.toThrow();
  });
});
