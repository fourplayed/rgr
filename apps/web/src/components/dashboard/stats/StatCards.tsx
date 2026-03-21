/**
 * StatCards - Row of 5 colored stat cards for dashboard overview
 *
 * Cards: Total Assets, Serviced Assets, Maintenance Tasks, Defects Reported, Out of Service
 * Each has a distinct background color, icon, count, title, and subtitle.
 * Shows glassmorphic skeleton placeholders while data is loading.
 */
import React, { useMemo } from 'react';
import { Package, CheckCircle, Wrench, AlertTriangle, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useFleetStatistics } from '@/hooks/useFleetData';

interface StatCardDef {
  icon: LucideIcon;
  /** Key into FleetStatistics, or null for cards not yet wired to live data */
  statKey: 'totalAssets' | 'activeAssets' | 'inMaintenance' | 'outOfService' | null;
  title: string;
  subtitle: string;
  bg: string;
}

const STAT_CARD_DEFS: StatCardDef[] = [
  {
    icon: Package,
    statKey: 'totalAssets',
    title: 'Total Assets',
    subtitle: 'registered and scanned',
    bg: '#2a8a9e',
  },
  {
    icon: CheckCircle,
    statKey: 'activeAssets',
    title: 'Serviced Assets',
    subtitle: 'currently in service',
    bg: '#2bbb6e',
  },
  {
    icon: Wrench,
    statKey: 'inMaintenance',
    title: 'Maintenance Tasks',
    subtitle: 'still pending',
    bg: '#e07020',
  },
  {
    icon: AlertTriangle,
    statKey: null,
    title: 'Defects Reported',
    subtitle: 'awaiting resolution',
    bg: '#e8a020',
  },
  {
    icon: XCircle,
    statKey: 'outOfService',
    title: 'Out of Service',
    subtitle: 'out of service',
    bg: '#d43050',
  },
];

interface StatCardsProps {
  isDark: boolean;
}

/** Skeleton placeholder card shown while data is loading */
function StatCardSkeleton({ bg }: { bg: string }) {
  return (
    <div
      className="relative flex-1 min-w-[200px] rounded-xl p-5 flex flex-col justify-between"
      style={{
        background: bg,
        minHeight: '130px',
        opacity: 0.6,
      }}
    >
      {/* Icon + count placeholder */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/10 animate-pulse" />
        <div className="w-12 h-8 rounded-lg bg-white/10 animate-pulse" />
      </div>
      {/* Title placeholder */}
      <div className="w-28 h-4 rounded bg-white/10 animate-pulse mb-1" />
      {/* Subtitle placeholder */}
      <div className="w-36 h-3 rounded bg-white/10 animate-pulse" />
    </div>
  );
}

export const StatCards = React.memo<StatCardsProps>(({ isDark: _isDark }) => {
  const { data, isLoading } = useFleetStatistics();

  const cards = useMemo(
    () =>
      STAT_CARD_DEFS.map((def) => ({
        ...def,
        count: def.statKey && data ? data[def.statKey] : 0,
      })),
    [data]
  );

  if (isLoading) {
    return (
      <div className="flex gap-4 w-full">
        {STAT_CARD_DEFS.map((def) => (
          <StatCardSkeleton key={def.title} bg={def.bg} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 w-full">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="group relative flex-1 min-w-[200px] rounded-xl p-5 flex flex-col justify-between cursor-pointer"
            style={{
              background: card.bg,
              minHeight: '130px',
              opacity: 1,
              transition: 'transform 0.3s ease, filter 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.filter = 'saturate(1.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.filter = 'saturate(1)';
            }}
          >
            {/* Bottom line on hover — sits below the card */}
            <div
              className="absolute left-3 right-3 h-[2.5px] rounded-full opacity-0 group-hover:opacity-100"
              style={{
                bottom: '-10px',
                background: card.bg,
                transition: 'opacity 0.3s ease',
              }}
            />
            {/* Icon + Count */}
            <div className="flex items-center gap-3 mb-3">
              <Icon className="w-8 h-8 text-white/80" />
              <span
                className="font-bold text-white"
                style={{ fontFamily: "'Lato', sans-serif", fontSize: '2.1rem' }}
              >
                {card.count}
              </span>
            </div>
            {/* Title */}
            <div
              className="font-semibold text-white"
              style={{ fontFamily: "'Lato', sans-serif", fontSize: '0.935rem' }}
            >
              {card.title}
            </div>
            {/* Subtitle */}
            <div
              className="text-white/70"
              style={{ fontFamily: "'Lato', sans-serif", fontSize: '0.825rem' }}
            >
              {card.subtitle}
            </div>
          </div>
        );
      })}
    </div>
  );
});

StatCards.displayName = 'StatCards';
