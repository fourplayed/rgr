/**
 * AssetUtilizationChart — donut chart showing asset status breakdown.
 */
import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import type { AssetUtilizationSnapshot } from '@/services/analyticsService';
import { RGR_COLORS } from '@/styles/color-palette';

export interface AssetUtilizationChartProps {
  data: AssetUtilizationSnapshot | undefined;
  isLoading?: boolean;
}

interface Segment {
  name: string;
  value: number;
  color: string;
}

const SEGMENT_CONFIG: { key: keyof Omit<AssetUtilizationSnapshot, 'total'>; label: string; color: string }[] = [
  { key: 'active', label: 'Active', color: RGR_COLORS.semantic.success },
  { key: 'idle', label: 'Idle', color: RGR_COLORS.bright.sky },
  { key: 'maintenance', label: 'Maintenance', color: RGR_COLORS.semantic.warning },
  { key: 'retired', label: 'Retired', color: RGR_COLORS.chrome.medium },
];

export const AssetUtilizationChart: React.FC<AssetUtilizationChartProps> = ({
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

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        No data available
      </div>
    );
  }

  const segments: Segment[] = SEGMENT_CONFIG
    .filter((cfg) => data[cfg.key] > 0)
    .map((cfg) => ({
      name: cfg.label,
      value: data[cfg.key],
      color: cfg.color,
    }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={segments}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
          >
            {segments.map((seg, idx) => (
              <Cell key={`cell-${idx}`} fill={seg.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(10, 14, 35, 0.95)',
              borderColor: `${RGR_COLORS.bright.vibrant}33`,
              borderRadius: '8px',
              color: RGR_COLORS.chrome.light,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Accessible legend rendered outside Recharts */}
      <ul
        className="flex flex-wrap gap-4 justify-center mt-2"
        aria-label="Chart legend"
      >
        {segments.map((seg) => (
          <li key={seg.name} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: seg.color }}
              aria-hidden="true"
            />
            <span style={{ color: RGR_COLORS.chrome.light, fontSize: 12 }}>
              {seg.name}: {seg.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AssetUtilizationChart;
