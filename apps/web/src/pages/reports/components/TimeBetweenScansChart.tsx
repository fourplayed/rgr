/**
 * TimeBetweenScansChart — histogram showing distribution of time between scans.
 */
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { TimeBetweenScansPoint } from '@/services/analyticsService';
import { RGR_COLORS } from '@/styles/color-palette';

export interface TimeBetweenScansChartProps {
  data: TimeBetweenScansPoint[];
  isLoading?: boolean;
}

const GRID_COLOR = `${RGR_COLORS.chrome.medium}33`;
const AXIS_STYLE = { fontSize: 11, fill: RGR_COLORS.chrome.medium };

function bucketLabel(bucketDays: number): string {
  switch (bucketDays) {
    case 0:
      return '0–7d';
    case 7:
      return '7–14d';
    case 14:
      return '14–30d';
    case 30:
      return '30–60d';
    case 60:
      return '60–90d';
    case 90:
      return '90d+';
    default:
      return `${bucketDays}d+`;
  }
}

export const TimeBetweenScansChart: React.FC<TimeBetweenScansChartProps> = ({
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

  const chartData = data.map((pt) => ({
    label: bucketLabel(pt.bucketDays),
    count: pt.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis dataKey="label" tick={AXIS_STYLE} stroke={GRID_COLOR} />
        <YAxis tick={AXIS_STYLE} stroke={GRID_COLOR} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(10, 14, 35, 0.95)',
            borderColor: `${RGR_COLORS.bright.vibrant}33`,
            borderRadius: '8px',
            color: RGR_COLORS.chrome.light,
          }}
        />
        <Bar dataKey="count" name="Assets" fill={RGR_COLORS.bright.sky} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TimeBetweenScansChart;
