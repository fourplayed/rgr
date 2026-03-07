/**
 * StatsGrid - Responsive grid layout for StatCards
 */
import React from 'react';
import { StatCard, type StatCardProps } from './StatCard';

export interface StatsGridProps {
  stats: StatCardProps[];
  columns?: 2 | 3 | 4;
  ariaLabel?: string;
  className?: string;
}

const COLUMN_CLASSES = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
} as const;

export const StatsGrid = React.memo<StatsGridProps>(
  ({ stats, columns = 4, ariaLabel = 'Fleet statistics', className = '' }) => {
    return (
      <section
        aria-label={ariaLabel}
        className={`grid ${COLUMN_CLASSES[columns]} gap-6 ${className}`}
      >
        {stats.map((stat, index) => (
          <StatCard
            key={`${stat.title}-${index}`}
            {...stat}
            className={`animate-fade-in-up ${stat.className || ''}`}
          />
        ))}
      </section>
    );
  }
);

StatsGrid.displayName = 'StatsGrid';

export default StatsGrid;
