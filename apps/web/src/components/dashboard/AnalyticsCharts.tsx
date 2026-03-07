/**
 * AnalyticsCharts - Charts component for fleet analytics
 *
 * Features:
 * - Scan frequency line/bar chart (daily/weekly)
 * - Asset utilization pie chart
 * - Hazard detection trend chart
 * - Time between scans histogram
 * - Vision UI glassmorphism styling
 * - Responsive design
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { Activity, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { VisionCard } from './vision/VisionCard';
import type {
  ScanFrequencyData,
  AssetUtilizationData,
  TimeBetweenScansData,
  HazardTrendData,
} from '@/services/analyticsService';
import { RGR_COLORS } from '@/styles/color-palette';

/**
 * Props for AnalyticsCharts
 */
export interface AnalyticsChartsProps {
  scanFrequency: ScanFrequencyData[];
  assetUtilization: AssetUtilizationData[];
  timeBetweenScans: TimeBetweenScansData[];
  hazardTrends: HazardTrendData[];
  averageTimeBetweenScans: number;
  totalScans: number;
  isLoading?: boolean;
  isDark?: boolean;
}

/**
 * Custom tooltip component for charts
 */
const CustomTooltip = ({
  active,
  payload,
  label,
  isDark = true,
}: {
  active?: boolean;
  payload?: Array<{ color?: string; name?: string; value?: unknown }>;
  label?: string;
  isDark?: boolean;
}) => {
  if (!active || !payload || !payload.length) return null;

  const bgColor = isDark
    ? 'rgba(15, 23, 42, 0.95)' // Navy darkest 95% opacity
    : 'rgba(255, 255, 255, 0.95)';
  const textColor = isDark ? RGR_COLORS.chrome.light : RGR_COLORS.navy.base;
  const borderColor = isDark ? RGR_COLORS.bright.vibrant : RGR_COLORS.navy.light;

  return (
    <div
      className="rounded-lg p-3 border backdrop-blur-sm"
      style={{
        backgroundColor: bgColor,
        borderColor: `${borderColor}33`,
        boxShadow: `0 4px 16px rgba(0, 0, 0, 0.3)`,
      }}
    >
      <p className="text-sm font-medium mb-1" style={{ color: textColor }}>
        {label}
      </p>
      {payload.map((entry: { color?: string; name?: string; value?: unknown }, index: number) => (
        <p key={index} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {String(entry.value)}
        </p>
      ))}
    </div>
  );
};

/**
 * Loading skeleton for chart
 */
const ChartSkeleton: React.FC<{ isDark?: boolean }> = ({ isDark: _isDark = true }) => {
  return (
    <div className="flex items-center justify-center h-64">
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: RGR_COLORS.bright.vibrant, borderTopColor: 'transparent' }}
      />
    </div>
  );
};

/**
 * Main AnalyticsCharts component
 */
export const AnalyticsCharts = React.memo<AnalyticsChartsProps>(
  ({
    scanFrequency,
    assetUtilization,
    timeBetweenScans,
    hazardTrends,
    averageTimeBetweenScans,
    totalScans,
    isLoading = false,
    isDark = true,
  }) => {
    // Chart colors
    const chartColors = useMemo(
      () => ({
        primary: RGR_COLORS.bright.vibrant,
        secondary: RGR_COLORS.bright.sky,
        success: RGR_COLORS.semantic.success,
        warning: RGR_COLORS.semantic.warning,
        error: RGR_COLORS.semantic.error,
        grid: isDark ? `${RGR_COLORS.chrome.medium}33` : `${RGR_COLORS.navy.light}33`,
        text: isDark ? RGR_COLORS.chrome.light : RGR_COLORS.navy.base,
      }),
      [isDark]
    );

    // Axis style
    const axisStyle = useMemo(
      () => ({
        fontSize: 12,
        fill: chartColors.text,
      }),
      [chartColors.text]
    );

    return (
      <div className="space-y-6">
        {/* Scan Frequency Chart */}
        <VisionCard title="Scan Frequency" icon={<Activity className="w-5 h-5" />} isDark={isDark}>
          {isLoading ? (
            <ChartSkeleton isDark={isDark} />
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-sm" style={{ color: chartColors.text }}>
                  <span className="font-semibold text-2xl mr-2">{totalScans}</span>
                  <span className="opacity-70">total scans</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={scanFrequency} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="label" tick={axisStyle} stroke={chartColors.grid} />
                  <YAxis tick={axisStyle} stroke={chartColors.grid} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Bar
                    dataKey="count"
                    name="Scans"
                    fill={chartColors.primary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </VisionCard>

        {/* Asset Utilization Chart */}
        <VisionCard
          title="Asset Utilization"
          icon={<TrendingUp className="w-5 h-5" />}
          isDark={isDark}
        >
          {isLoading ? (
            <ChartSkeleton isDark={isDark} />
          ) : (
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={assetUtilization}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(props: PieLabelRenderProps) => {
                      const d = props as PieLabelRenderProps & {
                        status: string;
                        percentage: number;
                      };
                      return `${d.status}: ${d.percentage}%`;
                    }}
                  >
                    {assetUtilization.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-shrink-0 space-y-2">
                {assetUtilization.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm" style={{ color: chartColors.text }}>
                      {item.status}: {item.count} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </VisionCard>

        {/* Time Between Scans Distribution */}
        <VisionCard title="Time Between Scans" icon={<Clock className="w-5 h-5" />} isDark={isDark}>
          {isLoading ? (
            <ChartSkeleton isDark={isDark} />
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-sm" style={{ color: chartColors.text }}>
                  <span className="font-semibold text-2xl mr-2">{averageTimeBetweenScans}</span>
                  <span className="opacity-70">days average</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={timeBetweenScans}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="range" tick={axisStyle} stroke={chartColors.grid} />
                  <YAxis tick={axisStyle} stroke={chartColors.grid} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Bar
                    dataKey="count"
                    name="Assets"
                    fill={chartColors.secondary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </VisionCard>

        {/* Hazard Trends Chart (if data available) */}
        {hazardTrends.length > 0 && hazardTrends.some((h) => h.total > 0) && (
          <VisionCard
            title="Hazard Detection Trends"
            icon={<AlertTriangle className="w-5 h-5" />}
            isDark={isDark}
          >
            {isLoading ? (
              <ChartSkeleton isDark={isDark} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={hazardTrends} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis
                    dataKey="date"
                    tick={axisStyle}
                    stroke={chartColors.grid}
                    tickFormatter={(value: string) =>
                      new Date(value).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    }
                  />
                  <YAxis tick={axisStyle} stroke={chartColors.grid} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="criticalCount"
                    name="Critical"
                    stroke={chartColors.error}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="highCount"
                    name="High"
                    stroke={chartColors.warning}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="mediumCount"
                    name="Medium"
                    stroke={chartColors.secondary}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="lowCount"
                    name="Low"
                    stroke={chartColors.success}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </VisionCard>
        )}
      </div>
    );
  }
);

AnalyticsCharts.displayName = 'AnalyticsCharts';

export default AnalyticsCharts;
