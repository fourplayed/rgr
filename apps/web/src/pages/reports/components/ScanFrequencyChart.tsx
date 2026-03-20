/**
 * ScanFrequencyChart — bar chart showing scans per day.
 */
import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { ScanFrequencyPoint } from '@/services/analyticsService';
import { RGR_COLORS } from '@/styles/color-palette';

export interface ScanFrequencyChartProps {
  data: ScanFrequencyPoint[];
  isLoading?: boolean;
}

const GRID_COLOR = `${RGR_COLORS.chrome.medium}33`;
const AXIS_STYLE = { fontSize: 11, fill: RGR_COLORS.chrome.medium };

export const ScanFrequencyChart: React.FC<ScanFrequencyChartProps> = ({
  data,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div
        data-testid="chart-skeleton"
        className="animate-pulse rounded-lg bg-white/5 h-64 w-full"
        aria-label="Loading chart"
      />
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis
          dataKey="date"
          tick={AXIS_STYLE}
          stroke={GRID_COLOR}
          tickFormatter={(v: string) => v.slice(5)} // MM-DD
        />
        <YAxis tick={AXIS_STYLE} stroke={GRID_COLOR} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(10, 14, 35, 0.95)',
            borderColor: `${RGR_COLORS.bright.vibrant}33`,
            borderRadius: '8px',
            color: RGR_COLORS.chrome.light,
          }}
        />
        <Bar
          dataKey="count"
          name="Scans"
          fill={RGR_COLORS.bright.vibrant}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ScanFrequencyChart;
