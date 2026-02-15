/**
 * HazardReviewFilters - Filter controls for hazard review panel
 * Uses Vision UI glassmorphism design
 *
 * Features:
 * - Severity dropdown/chips
 * - Status filter (Pending, Reviewed, All)
 * - Date range picker
 * - Search by asset number
 */
import React from 'react';
import { Search, Filter, Calendar, X } from 'lucide-react';
import { VisionCard } from '../vision/VisionCard';
import { RGR_COLORS } from '@/styles/color-palette';
import type { HazardSeverity } from './HazardReviewCard';

export type ReviewStatus = 'pending' | 'reviewed' | 'all';
export type DateRange = '7d' | '30d' | '90d' | 'custom';

export interface HazardFilters {
  severities: HazardSeverity[];
  status: ReviewStatus;
  dateRange: DateRange;
  searchQuery: string;
}

export interface HazardReviewFiltersProps {
  filters: HazardFilters;
  onFiltersChange: (filters: HazardFilters) => void;
  className?: string;
  isDark?: boolean;
}

// Severity colors
const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
} as const;

const SEVERITY_OPTIONS: { value: HazardSeverity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUS_OPTIONS: { value: ReviewStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'all', label: 'All' },
];

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom' },
];

export const HazardReviewFilters = React.memo<HazardReviewFiltersProps>(({
  filters,
  onFiltersChange,
  className = '',
  isDark = true,
}) => {
  // White text for dark theme, black for light theme
  const textPrimary = isDark ? '#ffffff' : '#000000';
  const textSecondary = isDark ? '#e2e8f0' : '#000000';
  const textMuted = isDark ? '#94a3b8' : '#000000';
  const inputBg = isDark ? 'rgba(0, 0, 0, 0.3)' : '#ffffff'; // 100% opaque white for light theme
  const inputBorder = isDark ? `${RGR_COLORS.chrome.medium}33` : 'rgba(107, 114, 128, 1.0)'; // 100% opacity

  const toggleSeverity = (severity: HazardSeverity) => {
    const newSeverities = filters.severities.includes(severity)
      ? filters.severities.filter(s => s !== severity)
      : [...filters.severities, severity];
    onFiltersChange({ ...filters, severities: newSeverities });
  };

  const clearFilters = () => {
    onFiltersChange({
      severities: [],
      status: 'all',
      dateRange: '30d',
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    filters.severities.length > 0 ||
    filters.status !== 'all' ||
    filters.dateRange !== '30d' ||
    filters.searchQuery.length > 0;

  // Border color matching dashboard pattern
  const borderColor = isDark
    ? `${RGR_COLORS.chrome.medium}33`
    : '#9ca3af'; // Gray-400 at 100% opacity for light theme

  // Header background - matching nav bar for consistency
  const headerBg = isDark
    ? '#060b28' // Dark header (same as nav bar)
    : '#e5e7eb'; // Light grey (matching nav bar)

  return (
    <VisionCard className={className} isDark={isDark} noPadding>
      {/* CSS for login-style input focus */}
      <style>{`
        .hazard-filter-input:focus {
          background-color: rgba(229, 229, 229, 0.6) !important;
        }
        .hazard-filter-input-dark:focus {
          background-color: rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>

      {/* Card Header - matching dashboard pattern */}
      <div
        className="p-4 border-b flex-shrink-0"
        style={{
          borderColor,
          background: headerBg,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-6 h-6" style={{ color: isDark ? '#ffffff' : '#000000' }} />
            <h3 className="text-lg font-medium" style={{ color: textPrimary }}>
              Filters
            </h3>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded px-2 py-1"
              style={{ color: isDark ? '#60a5fa' : '#2563eb' }} // blue-400 for dark, blue-600 for light (matching login page)
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDark ? '#93c5fd' : '#1d4ed8'; // blue-300 for dark, blue-700 for light
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isDark ? '#60a5fa' : '#2563eb';
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Card Content - Vertical Layout for sidebar */}
      <div className="p-4">
        <div className="space-y-4">
          {/* Search - styled like login page inputs */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: textSecondary }}>
              Search
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: textMuted }}
              />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
                placeholder="Asset number..."
                className={`w-full pl-10 pr-10 py-3 rounded-lg transition-all duration-200 focus:outline-none ${
                  isDark
                    ? 'text-white placeholder:text-gray-500 hazard-filter-input-dark'
                    : 'text-slate-900 placeholder:text-gray-600 hazard-filter-input'
                }`}
                style={isDark ? {
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(235, 235, 235, 0.15)',
                  color: '#f8fafc',
                  outline: 'none',
                } : {
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  border: '1.5px solid rgba(107, 114, 128, 0.75)',
                  color: '#0c4a6e',
                  outline: 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                }}
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, searchQuery: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" style={{ color: textMuted }} />
                </button>
              )}
            </div>
          </div>

          {/* Severity Chips */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: textSecondary }}>
              Severity
            </label>
            <div className="flex gap-2">
              {SEVERITY_OPTIONS.map((option) => {
                const isSelected = filters.severities.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleSeverity(option.value)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                    style={{
                      backgroundColor: isSelected
                        ? `${SEVERITY_COLORS[option.value]}20`
                        : inputBg,
                      color: isSelected
                        ? SEVERITY_COLORS[option.value]
                        : textMuted,
                      border: `1.5px solid ${isSelected ? SEVERITY_COLORS[option.value] : inputBorder}`,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status and Date Range - Same Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Status Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: textSecondary }}>
                Status
              </label>
              <div className="relative">
                <select
                  value={filters.status}
                  onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as ReviewStatus })}
                  className="w-full px-3 py-2 pr-8 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer"
                  style={isDark ? {
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(235, 235, 235, 0.15)',
                    color: '#f8fafc',
                    outline: 'none',
                  } : {
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    border: '1.5px solid rgba(107, 114, 128, 0.75)',
                    color: '#0c4a6e',
                    outline: 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                  }}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      style={{
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                      }}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke={textMuted} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: textSecondary }}>
                <Calendar className="inline w-3.5 h-3.5 mr-1" />
                Range
              </label>
              <div className="relative">
                <select
                  value={filters.dateRange}
                  onChange={(e) => onFiltersChange({ ...filters, dateRange: e.target.value as DateRange })}
                  className="w-full px-3 py-2 pr-8 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer"
                  style={isDark ? {
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(235, 235, 235, 0.15)',
                    color: '#f8fafc',
                    outline: 'none',
                  } : {
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    border: '1.5px solid rgba(107, 114, 128, 0.75)',
                    color: '#0c4a6e',
                    outline: 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                  }}
                >
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      style={{
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                      }}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke={textMuted} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Summary */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor }}>
            <div className="flex flex-wrap gap-2">
              {filters.severities.map((severity) => (
                <span
                  key={severity}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium"
                  style={{
                    backgroundColor: `${SEVERITY_COLORS[severity]}20`,
                    color: SEVERITY_COLORS[severity],
                  }}
                >
                  {severity}
                  <button
                    type="button"
                    onClick={() => toggleSeverity(severity)}
                    className="hover:opacity-70"
                    aria-label={`Remove ${severity} filter`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {filters.status !== 'all' && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium"
                  style={{
                    backgroundColor: `${RGR_COLORS.bright.vibrant}20`,
                    color: RGR_COLORS.bright.vibrant,
                  }}
                >
                  Status: {filters.status}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </VisionCard>
  );
});

HazardReviewFilters.displayName = 'HazardReviewFilters';

export default HazardReviewFilters;
