/**
 * FleetOverview - Animated stat cards showing fleet metrics
 */
import { motion } from 'motion/react';
import { useSpring, animated } from '@react-spring/web';
import { Package, CheckCircle, Wrench, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FleetStatistics } from '@/hooks/useFleetData';
import { GLASS_CARD, ENTRANCE_EASE } from '../styles';

interface FleetOverviewProps {
  stats: FleetStatistics | null;
  isLoading: boolean;
  isDark: boolean;
  delay: number;
}

interface StatDef {
  icon: LucideIcon;
  statKey: keyof FleetStatistics | null;
  label: string;
  accent: string;
  accentGlow: string;
}

const STAT_DEFS: StatDef[] = [
  {
    icon: Package,
    statKey: 'totalAssets',
    label: 'Total Assets',
    accent: '#3b82f6',
    accentGlow: 'rgba(59, 130, 246, 0.25)',
  },
  {
    icon: CheckCircle,
    statKey: 'activeAssets',
    label: 'Active',
    accent: '#2dd4bf',
    accentGlow: 'rgba(45, 212, 191, 0.25)',
  },
  {
    icon: Wrench,
    statKey: 'inMaintenance',
    label: 'In Maintenance',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.25)',
  },
  {
    icon: XCircle,
    statKey: 'outOfService',
    label: 'Out of Service',
    accent: '#ef4444',
    accentGlow: 'rgba(239, 68, 68, 0.25)',
  },
];

function AnimatedCounter({ value, isLoading }: { value: number; isLoading: boolean }) {
  const spring = useSpring({
    from: { val: 0 },
    to: { val: isLoading ? 0 : value },
    delay: 400,
    config: { tension: 120, friction: 14 },
  });

  if (isLoading) {
    return (
      <div className="w-10 h-8 rounded bg-white/10 animate-pulse" />
    );
  }

  return (
    <animated.span
      className="font-bold text-white"
      style={{ fontFamily: "'Lato', sans-serif", fontSize: '2rem' }}
    >
      {spring.val.to((v) => Math.floor(v))}
    </animated.span>
  );
}

export function FleetOverview({ stats, isLoading, isDark, delay }: FleetOverviewProps) {
  const cardStyle = isDark ? GLASS_CARD.dark : GLASS_CARD.light;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: ENTRANCE_EASE }}
      className="px-6 pb-6 max-w-4xl mx-auto w-full"
    >
      <h2
        className="text-sm uppercase tracking-widest mb-4 px-1"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: isDark ? '#64748b' : 'rgba(255, 255, 255, 0.5)',
          letterSpacing: '0.15em',
        }}
      >
        Fleet Overview
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_DEFS.map((def, i) => {
          const Icon = def.icon;
          const value = def.statKey && stats ? (stats[def.statKey] as number) : 0;

          return (
            <motion.div
              key={def.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: delay / 1000 + 0.1 * (i + 1),
                ease: ENTRANCE_EASE,
              }}
              className="p-5 flex flex-col gap-3 cursor-default transition-transform duration-300 hover:-translate-y-1"
              style={{
                ...cardStyle,
                borderLeft: `2px solid ${def.accent}`,
                boxShadow: `0 4px 24px ${def.accentGlow}`,
              }}
            >
              <Icon className="w-5 h-5" style={{ color: def.accent }} />
              <AnimatedCounter value={value} isLoading={isLoading} />
              <span
                className="text-xs"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  color: isDark ? '#94a3b8' : 'rgba(255, 255, 255, 0.7)',
                }}
              >
                {def.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
