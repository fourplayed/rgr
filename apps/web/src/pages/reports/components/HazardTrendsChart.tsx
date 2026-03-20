/**
 * HazardTrendsChart — line chart showing hazard alerts over time by severity.
 */
import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { HazardTrendPoint } from '@/services/analyticsService';
import { RGR_COLORS } from '@/styles/color-palette';

export interface HazardTrendsChartProps {
  data: HazardTrendPoint[];
  isLoading?: boolean;
}

const GRID_COLOR = `${RGR_COLORS.chrome.medium}33`;
const AXIS_STYLE = { fontSize: 11, fill: RGR_COLORS.chrome.medium };

export const HazardTrendsChart: React.FC<HazardTrendsChartProps> = ({
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
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis
          dataKey="date"
          tick={AXIS_STYLE}
          stroke={GRID_COLOR}
          tickFormatter={(v: string) =>
            new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }
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
        <Legend
          formatter={(value) => (
            <span style={{ color: RGR_COLORS.chrome.light, fontSize: 12 }}>{value}</span>
          )}
        />
        <Line
          type="monotone"
          dataKey="critical"
          name="Critical"
          stroke={RGR_COLORS.semantic.error}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="high"
          name="High"
          stroke={RGR_COLORS.semantic.warning}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="medium"
          name="Medium"
          stroke={RGR_COLORS.bright.sky}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="low"
          name="Low"
          stroke={RGR_COLORS.semantic.success}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default HazardTrendsChart;
