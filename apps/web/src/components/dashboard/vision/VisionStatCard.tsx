/**
 * VisionStatCard - Solid color stat cards with spin animation
 * Updated: 2026-01-09
 * Design: Clean solid colors with semantic meaning
 *
 * Features:
 * - Solid background colors (no gradients)
 * - Semantic icon colors reinforcing card meaning
 * - Preserved spin animation on hover
 */
import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

export type GradientType = 'info' | 'success' | 'warning' | 'error' | 'brand' | 'caution';

export interface VisionStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  gradient?: GradientType;
  change?: {
    value: number;
    label: string;
  };
  /** When true, increase is bad (red) and decrease is good (green) */
  invertColors?: boolean;
  metric?: {
    text: string;
    label: string;
  };
  className?: string;
  /** Theme mode - when true, uses dark theme; when false, uses light theme */
  isDark?: boolean;
  /** Click handler - makes the card clickable */
  onClick?: () => void;
}

interface ColorConfig {
  background: string; // Solid hex color
  icon: string;
}

// SOLID COLORS - No gradients
const COLOR_CONFIG: Record<GradientType, ColorConfig> = {
  info: {
    background: '#0891b2', // cyan-600
    icon: '#ffffff',
  },
  success: {
    background: '#10b981', // emerald-500
    icon: '#ffffff',
  },
  warning: {
    background: '#f59e0b', // amber-500
    icon: '#ffffff',
  },
  error: {
    background: '#dc2626', // red-600
    icon: '#ffffff',
  },
  brand: {
    background: '#8b5cf6', // violet-500
    icon: '#ffffff',
  },
  caution: {
    background: '#f97316', // orange-500
    icon: '#ffffff',
  },
};

export const VisionStatCard = React.memo<VisionStatCardProps>(({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient = 'info',
  change,
  invertColors = false,
  metric,
  className = '',
  isDark = true,
  onClick,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);

  const config = COLOR_CONFIG[gradient];

  // For invertColors: increase is bad (red), decrease is good (green)
  const isPositive = change ? change.value >= 0 : false;
  // Use solid semantic colors for maximum visibility
  const changeColor = invertColors
    ? (isPositive ? '#dc2626' : '#22c55e') // Bright red : Solid green
    : (isPositive ? '#22c55e' : '#dc2626'); // Solid green : Bright red

  const handleMouseEnter = () => {
    if (!isSpinning) {
      setIsSpinning(true);
      setTimeout(() => setIsSpinning(false), 1000); // Reset after animation duration
    }
  };

  // Theme adjustments for visibility
  const textShadow = isDark ? 'drop-shadow-sm' : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]';


  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden ${className} ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        perspective: '1500px',
      }}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${title}: ${value}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <style>{`
        @keyframes spin-widget {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .spinning-widget {
          animation: spin-widget 1000ms ease-in-out forwards;
        }
      `}</style>
      <div
        className={`stat-card-content rounded-2xl overflow-hidden aspect-[5/3.36] relative ${isSpinning ? 'spinning-widget' : ''}`}
        style={{
          transformStyle: 'preserve-3d',
          backgroundColor: config.background,
        }}
        onMouseEnter={handleMouseEnter}
      >

        {/* Content */}
        <div className="relative flex flex-col h-full px-4 py-3">
          {/* Top section: Icon + Value - fixed height */}
          <div className="flex items-center justify-center gap-4 h-[60px]">
            <Icon
              className={`w-12 h-12 flex-shrink-0 ${textShadow}`}
              style={{
                color: config.icon,
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))',
              }}
            />
            <h3 className={`text-[45px] font-bold text-white ${textShadow} tracking-tight leading-none`}>
              {value}
            </h3>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-[8px]" />

          {/* Bottom section: Title + Subtitle + Change - fixed structure */}
          <div className="text-center">
            <p className="text-[17.5px] font-medium text-white/90 h-[23px] flex items-end justify-center pb-0.5">
              {title}
            </p>
            <p className="text-[15.5px] text-white/70 h-[19px] flex items-end justify-center pb-0.5 line-clamp-1">
              {subtitle || '\u00A0'}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1 h-[44px]">
              {change && (
                <>
                  <span
                    className="text-[36px] font-extrabold leading-none"
                    style={{
                      color: changeColor,
                      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    {change.value >= 0 ? '▲' : '▼'}
                  </span>
                  <span className="text-[26px] font-extrabold text-white leading-none">
                    {Math.abs(change.value)}%
                  </span>
                  <span className="text-[17px] font-medium text-white">{change.label}</span>
                </>
              )}
              {metric && (
                <>
                  <span className="text-[17.5px] font-bold text-white">{metric.text}</span>
                  <span className="text-[17px] font-medium text-white">{metric.label}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: Only re-render if critical props change
  // This prevents re-renders when parent updates but our data hasn't changed
  return (
    prevProps.value === nextProps.value &&
    prevProps.title === nextProps.title &&
    prevProps.subtitle === nextProps.subtitle &&
    prevProps.gradient === nextProps.gradient &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.invertColors === nextProps.invertColors &&
    prevProps.className === nextProps.className &&
    prevProps.onClick === nextProps.onClick &&
    // Deep compare change object
    (prevProps.change?.value === nextProps.change?.value &&
     prevProps.change?.label === nextProps.change?.label) &&
    // Deep compare metric object
    (prevProps.metric?.text === nextProps.metric?.text &&
     prevProps.metric?.label === nextProps.metric?.label)
  );
});

VisionStatCard.displayName = 'VisionStatCard';

export default VisionStatCard;
