/**
 * QuickAction - Single action button with icon and shimmer effect
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export type ActionVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: ActionVariant;
  disabled?: boolean;
  className?: string;
}

const VARIANT_CONFIG: Record<
  ActionVariant,
  {
    gradient: string;
    hoverGradient: string;
    shadow: string;
  }
> = {
  default: {
    gradient: 'from-slate-600 to-slate-700',
    hoverGradient: 'from-slate-500 to-slate-600',
    shadow: 'shadow-slate-500/30',
  },
  primary: {
    gradient: 'from-blue-600 to-indigo-600',
    hoverGradient: 'from-blue-500 to-indigo-500',
    shadow: 'shadow-blue-glow',
  },
  success: {
    gradient: 'from-emerald-600 to-teal-600',
    hoverGradient: 'from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-glow',
  },
  warning: {
    gradient: 'from-amber-600 to-orange-600',
    hoverGradient: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-glow',
  },
  danger: {
    gradient: 'from-red-600 to-rose-600',
    hoverGradient: 'from-red-500 to-rose-500',
    shadow: 'shadow-red-glow',
  },
};

export const QuickAction = React.memo<QuickActionProps>(
  ({ icon: Icon, label, onClick, variant = 'default', disabled = false, className = '' }) => {
    const { isDark } = useTheme();
    const config = VARIANT_CONFIG[variant];

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`
        group relative w-full p-4 rounded-xl text-white font-medium
        transition-all duration-300
        hover:scale-[1.02] hover:-translate-y-0.5
        shadow-lg hover:shadow-xl
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        overflow-hidden
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isDark ? 'focus:ring-offset-slate-900' : 'focus:ring-offset-white'}
        ${className}
      `}
        aria-label={label}
      >
        {/* Base gradient */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${config.gradient} transition-all duration-300`}
        />

        {/* Hover gradient */}
        <div
          className={`
        absolute inset-0 bg-gradient-to-br ${config.hoverGradient}
        opacity-0 group-hover:opacity-100 transition-opacity duration-300
      `}
        />

        {/* Shimmer effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>

        {/* Content */}
        <div className="relative flex items-center gap-3">
          <div
            className={`
          p-2.5 rounded-lg bg-white/20 backdrop-blur-sm
          ${config.shadow}
          group-hover:scale-110 transition-transform duration-300
        `}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="text-sm">{label}</span>
        </div>
      </button>
    );
  }
);

QuickAction.displayName = 'QuickAction';

export default QuickAction;
