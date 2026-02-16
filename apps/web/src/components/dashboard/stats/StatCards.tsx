/**
 * StatCards - Row of 5 colored stat cards for dashboard overview
 *
 * Cards: Total Assets, Serviced Assets, Maintenance Tasks, AI Image Analysis, Out of Service
 * Each has a distinct background color, icon, count, title, and subtitle.
 */
import React from 'react';
import { Package, CheckCircle, Wrench, Camera, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatCardData {
  icon: LucideIcon;
  count: number;
  title: string;
  subtitle: string;
  bg: string;
}

const STAT_CARDS: StatCardData[] = [
  {
    icon: Package,
    count: 22,
    title: 'Total Assets',
    subtitle: 'registered and scanned',
    bg: '#2a8a9e',
  },
  {
    icon: CheckCircle,
    count: 0,
    title: 'Serviced Assets',
    subtitle: 'currently in service',
    bg: '#2bbb6e',
  },
  {
    icon: Wrench,
    count: 0,
    title: 'Maintenance Tasks',
    subtitle: 'still pending',
    bg: '#e8a020',
  },
  {
    icon: Camera,
    count: 0,
    title: 'AI Image Analysis',
    subtitle: 'awaiting review',
    bg: '#e07020',
  },
  {
    icon: XCircle,
    count: 1,
    title: 'Out of Service',
    subtitle: 'out of service',
    bg: '#d43050',
  },
];

interface StatCardsProps {
  isDark: boolean;
}

export const StatCards = React.memo<StatCardsProps>(({ isDark: _isDark }) => {
  return (
    <div className="flex flex-wrap gap-4">
      {STAT_CARDS.map((card) => {
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
