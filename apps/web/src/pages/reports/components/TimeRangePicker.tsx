/**
 * TimeRangePicker — controlled button group for selecting an analytics time range.
 */
import React from 'react';
import type { AnalyticsTimeRange } from '@/services/analyticsService';
import { RGR_COLORS } from '@/styles/color-palette';

export interface TimeRangePickerProps {
  value: AnalyticsTimeRange;
  onChange: (range: AnalyticsTimeRange) => void;
}

const RANGES: { label: string; value: AnalyticsTimeRange }[] = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: '1y', value: '1y' },
];

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({ value, onChange }) => {
  return (
    <div
      className="inline-flex rounded-lg overflow-hidden border"
      style={{ borderColor: 'rgba(235, 235, 235, 0.2)' }}
      role="group"
      aria-label="Time range selector"
    >
      {RANGES.map((range, idx) => {
        const isActive = range.value === value;
        return (
          <button
            key={range.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(range.value)}
            className={`
              px-4 py-2 text-sm font-medium transition-colors duration-150
              ${idx > 0 ? 'border-l' : ''}
              ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}
            `}
            style={{
              backgroundColor: isActive
                ? RGR_COLORS.bright.vibrant
                : 'rgba(10, 38, 84, 0.6)',
              borderColor: 'rgba(235, 235, 235, 0.15)',
            }}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
};

export default TimeRangePicker;
