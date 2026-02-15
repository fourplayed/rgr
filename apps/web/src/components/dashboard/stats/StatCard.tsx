/**
 * StatCard - Premium glassmorphism statistics card
 * Features: animated gradients, hover effects, status indicators
 */
import React, { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export type IndicatorColor = 'green' | 'amber' | 'red' | 'blue' | 'purple';

export interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  indicatorColor: IndicatorColor;
  change?: number;
  progress?: number;
  onClick?: () => void;
  className?: string;
}

const INDICATOR_CONFIG: Record<IndicatorColor, {
  status: string;
  gradient: string;
  iconBg: string;
  border: string;
  glow: string;
  iconColor: string;
}> = {
  green: {
    status: 'Operational',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-glow',
    iconColor: 'text-white',
  },
  amber: {
    status: 'Needs attention',
    gradient: 'from-amber-500/20 to-orange-500/20',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-glow',
    iconColor: 'text-white',
  },
  red: {
    status: 'Critical',
    gradient: 'from-red-500/20 to-rose-500/20',
    iconBg: 'bg-gradient-to-br from-red-500 to-rose-600',
    border: 'border-red-500/30',
    glow: 'shadow-red-glow',
    iconColor: 'text-white',
  },
  blue: {
    status: 'Total fleet',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-glow',
    iconColor: 'text-white',
  },
  purple: {
    status: 'Utilization',
    gradient: 'from-purple-500/20 to-pink-500/20',
    iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-glow',
    iconColor: 'text-white',
  },
};

export const StatCard = React.memo<StatCardProps>(({
  title,
  value,
  icon: Icon,
  indicatorColor,
  change,
  progress,
  onClick,
  className = '',
}) => {
  const { isDark } = useTheme();
  const config = useMemo(() => INDICATOR_CONFIG[indicatorColor], [indicatorColor]);
  const [isSpinning, setIsSpinning] = useState(false);

  const formattedValue = useMemo(() => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  }, [value]);

  const cardBg = isDark ? 'bg-slate-900/80' : 'bg-white'; // Light theme: solid white (100% opacity)
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subtitleColor = isDark ? 'text-slate-400' : 'text-slate-600';

  const handleMouseEnter = () => {
    if (!isSpinning) {
      setIsSpinning(true);
      setTimeout(() => setIsSpinning(false), 1000); // Reset after animation duration
    }
    if (onClick) onClick();
  };

  return (
    <div
      className={`group relative ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ perspective: '1500px' }}
      role={onClick ? 'button' : 'region'}
      aria-label={`${title}: ${formattedValue}`}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && handleMouseEnter() : undefined}
    >
      <style>{`
        @keyframes spin-stat-card {
          0% { transform: rotateY(0deg); opacity: 0.9; }
          50% { opacity: 1; }
          100% { transform: rotateY(360deg); opacity: 0.9; }
        }
        .spinning-stat-card {
          animation: spin-stat-card 1000ms ease-in-out forwards;
        }
      `}</style>
      {/* Animated gradient background blur */}
      <div className={`
        absolute -inset-0.5 rounded-2xl blur opacity-0
        group-hover:opacity-40 transition-opacity duration-500
        bg-gradient-to-r ${config.gradient}
      `} />

      {/* Glass card */}
      <div
        className={`
          relative p-6 rounded-2xl border backdrop-blur-xl
          ${cardBg} ${config.border}
          shadow-glass hover:shadow-glass-hover
          bg-gradient-to-br ${config.gradient}
          ${isSpinning ? 'spinning-stat-card' : ''}
        `}
        style={{
          transformStyle: 'preserve-3d',
          opacity: 0.9,
        }}
        onMouseEnter={handleMouseEnter}
      >
        {/* Header with icon */}
        <div className="flex items-start justify-between mb-4">
          <div className={`
            p-3 rounded-xl ${config.iconBg}
            shadow-lg ${config.glow}
            transform transition-transform duration-300
            group-hover:scale-110 group-hover:rotate-3
          `}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} aria-hidden="true" />
          </div>

          {/* Trend indicator */}
          {change !== undefined && change !== 0 && (
            <div className={`
              flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
              ${change > 0
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
              }
            `}>
              {change > 0 ? (
                <TrendingUp className="w-3 h-3" aria-hidden="true" />
              ) : (
                <TrendingDown className="w-3 h-3" aria-hidden="true" />
              )}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>

        {/* Value display */}
        <div className="space-y-1 mb-4">
          <p className={`text-sm font-medium uppercase tracking-wider ${subtitleColor}`}>
            {title}
          </p>
          <p className={`text-4xl font-bold tabular-nums ${textColor}`}>
            {formattedValue}
          </p>
        </div>

        {/* Progress bar for utilization */}
        {progress !== undefined && (
          <div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000 ease-out rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className={`text-xs mt-1.5 ${subtitleColor}`}>
              {progress}% capacity
            </p>
          </div>
        )}

        {/* Status indicator (when no progress) */}
        {progress === undefined && (
          <div className="flex items-center gap-2">
            <div className={`
              w-2 h-2 rounded-full animate-pulse
              ${indicatorColor === 'green' ? 'bg-emerald-500' : ''}
              ${indicatorColor === 'amber' ? 'bg-amber-500' : ''}
              ${indicatorColor === 'red' ? 'bg-red-500' : ''}
              ${indicatorColor === 'blue' ? 'bg-blue-500' : ''}
              ${indicatorColor === 'purple' ? 'bg-purple-500' : ''}
            `} aria-hidden="true" />
            <span className={`text-xs ${subtitleColor}`}>
              {config.status}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
