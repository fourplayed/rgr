/**
 * DashboardHeader - Tactical Operations header with search-first design
 * Layout 5: Prominent search bar, compact actions
 */
import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search, RefreshCw, ChevronDown, X } from 'lucide-react';
import { ThemeToggle } from '../theme';
import { useTheme } from '@/hooks/useTheme';
import type { TimeRange } from '@/pages/dashboard/types';
import { Logo } from '@/components/common';

export interface QuickActionButton {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'default';
}

export interface DashboardHeaderProps {
  quickActions?: QuickActionButton[];
  selectedTimeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  className?: string;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All' },
];

export const DashboardHeader = React.memo<DashboardHeaderProps>(({
  quickActions = [],
  selectedTimeRange = 'today',
  onTimeRangeChange,
  onRefresh,
  isRefreshing = false,
  onSearch,
  searchPlaceholder = 'Search assets by ID, location...',
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark } = useTheme();

  const headerBg = isDark ? 'bg-slate-900' : 'bg-white';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const mutedColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-800' : 'bg-slate-50';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearch?.('');
  };

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        ${headerBg} border-b ${borderColor}
        shadow-sm
        ${className}
      `}
    >
      <div className="h-14 px-4 lg:px-6 flex items-center gap-4">
        {/* Left: Logo */}
        <div className="flex-shrink-0">
          <Logo size="custom" className="h-8 w-auto" alt="RGR Fleet Manager" />
        </div>

        {/* Center: Search Bar - Prominent */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-xl"
        >
          <div className="relative">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedColor}`}
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={`
                w-full pl-10 pr-10 py-2 rounded-lg
                ${inputBg} border ${borderColor}
                ${isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-600'}
                text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                transition-all duration-150
              `}
              aria-label="Search assets"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                aria-label="Clear search"
              >
                <X className={`w-4 h-4 ${mutedColor}`} />
              </button>
            )}
          </div>
        </form>

        {/* Right: Compact Actions */}
        <div className="flex items-center gap-2">
          {/* Quick action buttons - icon only on mobile, with label on desktop */}
          {quickActions.slice(0, 2).map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                  transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${action.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : `${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'}`
                  }
                `}
                title={action.label}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="hidden lg:inline">{action.label}</span>
              </button>
            );
          })}

          {/* Time range dropdown */}
          {onTimeRangeChange && (
            <div className="relative hidden sm:block">
              <select
                value={selectedTimeRange}
                onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
                className={`
                  appearance-none pl-3 pr-7 py-2 rounded-lg text-sm font-medium
                  border ${borderColor} ${inputBg}
                  ${isDark ? 'text-slate-200' : 'text-slate-700'}
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  cursor-pointer
                `}
                aria-label="Select time range"
              >
                {TIME_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 ${mutedColor} pointer-events-none`}
                aria-hidden="true"
              />
            </div>
          )}

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`
              p-2 rounded-lg border ${borderColor}
              ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-label="Refresh dashboard data"
          >
            <RefreshCw
              className={`w-4 h-4 ${mutedColor} ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </button>

          {/* Theme toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
});

DashboardHeader.displayName = 'DashboardHeader';

export default DashboardHeader;
