/**
 * StatsPills - Compact inline stats row for Layout 2
 * Professional, minimal design with blue/white theme
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export interface StatPill {
  label: string;
  value: number;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gray';
}

export interface StatsPillsProps {
  stats: StatPill[];
  className?: string;
}

const COLOR_MAP = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    accent: 'bg-blue-600',
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    accent: 'bg-emerald-500',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    accent: 'bg-amber-500',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    accent: 'bg-red-500',
  },
  gray: {
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-700 dark:text-slate-300',
    accent: 'bg-slate-500',
  },
};

export const StatsPills = React.memo<StatsPillsProps>(({ stats, className = '' }) => {
  const { isDark } = useTheme();

  const containerBg = isDark ? 'bg-slate-900/80' : 'bg-slate-50';
  const containerBorder = isDark ? 'border-slate-800' : 'border-slate-200';

  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-2.5
        ${containerBg} border-b ${containerBorder}
        overflow-x-auto
        ${className}
      `}
      role="region"
      aria-label="Fleet statistics"
    >
      {stats.map((stat, index) => {
        const colors = COLOR_MAP[stat.color || 'blue'];
        const Icon = stat.icon;

        return (
          <div
            key={`${stat.label}-${index}`}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg
              ${colors.bg} border ${colors.border}
              transition-all duration-150
              hover:shadow-sm
            `}
          >
            {/* Color accent bar */}
            <div className={`w-1 h-6 rounded-full ${colors.accent}`} aria-hidden="true" />

            {/* Icon if provided */}
            {Icon && <Icon className={`w-4 h-4 ${colors.text}`} aria-hidden="true" />}

            {/* Value */}
            <span className={`text-lg font-bold ${colors.text}`}>{stat.value}</span>

            {/* Label */}
            <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {stat.label}
            </span>
          </div>
        );
      })}
    </div>
  );
});

StatsPills.displayName = 'StatsPills';

export default StatsPills;
