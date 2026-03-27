/**
 * FleetStatsOverlay - Glassmorphic stats panel floating over the map
 *
 * Displays fleet statistics in glassmorphic cards on the left side of the map.
 * Cards adapt to light/dark theme: frosted white glass in light mode, dark
 * glass in dark mode. Cards have pointer-events but the container gaps do not,
 * so map interaction is preserved between cards.
 */
import { useFleetStatistics } from '@/hooks/useFleetData';

const CARD =
  'pointer-events-auto backdrop-blur-xl rounded-xl p-4 bg-[rgba(255,255,255,0.75)] border border-[rgba(0,0,48,0.08)] shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:bg-[rgba(0,0,0,0.55)] dark:border-white/[0.12] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]';

/* Text color utility classes for light/dark theme support within stat cards */
const TEXT_PRIMARY = 'text-[#1E293B] dark:text-white';
const TEXT_SECONDARY = 'text-[#475569] dark:text-white/60';
const TEXT_MUTED = 'text-[#64748B] dark:text-white/40';
const TEXT_SEMI = 'text-[#334155] dark:text-white/70';
const TEXT_DIM = 'text-[#64748B] dark:text-white/50';
const BAR_BG = 'bg-[#D0D4DA] dark:bg-white/10';

const STATUS_ROWS = [
  { key: 'totalAssets', label: 'Total', color: '#3b82f6' },
  { key: 'activeAssets', label: 'Active', color: '#22c55e' },
  { key: 'inMaintenance', label: 'Maintenance', color: '#f59e0b' },
  { key: 'outOfService', label: 'Out of Service', color: '#ef4444' },
] as const;

export function FleetStatsOverlay() {
  const { data: stats, isLoading } = useFleetStatistics();

  if (isLoading || !stats) {
    return (
      <div className="pointer-events-none absolute left-4 top-[68px] bottom-4 z-10 flex w-[280px] flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`${CARD} animate-pulse`}>
            <div className="h-16 rounded bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  const utilization =
    stats.totalAssets > 0 ? Math.round((stats.activeAssets / stats.totalAssets) * 100) : 0;

  return (
    <div
      className="pointer-events-none absolute left-4 top-[68px] bottom-4 z-10 flex w-[280px] flex-col gap-3"
      aria-label="Fleet statistics overlay"
      role="region"
    >
      {/* Card 1 - Fleet Overview */}
      <div className={CARD}>
        {/* Accent glow line */}
        <div className="mb-3 h-[2px] rounded-full bg-gradient-to-r from-[#00A8FF] via-[#00A8FF]/60 to-transparent" />
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#00A8FF]/70">
          Fleet Overview
        </p>
        <p className={`mt-1 text-4xl font-bold tabular-nums ${TEXT_PRIMARY}`}>
          {stats.totalAssets}
        </p>
        <p className={`mt-0.5 text-xs ${TEXT_MUTED}`}>Total Fleet Assets</p>
        <div className={`mt-3 flex gap-4 text-[11px] ${TEXT_DIM}`}>
          <span>
            <span className={`font-semibold tabular-nums ${TEXT_SEMI}`}>{stats.trailerCount}</span>{' '}
            Trailers
          </span>
          <span>
            <span className={`font-semibold tabular-nums ${TEXT_SEMI}`}>{stats.dollyCount}</span>{' '}
            Dollies
          </span>
        </div>
      </div>

      {/* Card 2 - Status Breakdown */}
      <div className={CARD}>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-[#00A8FF]/70">
          Status Breakdown
        </p>
        <div className="flex flex-col gap-2">
          {STATUS_ROWS.map(({ key, label, color }) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className={TEXT_SECONDARY}>{label}</span>
              </div>
              <span className={`font-semibold tabular-nums ${TEXT_PRIMARY}`}>{stats[key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Card 3 - Utilization */}
      <div className={CARD}>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-[#00A8FF]/70">
          Fleet Utilization
        </p>
        <p className={`text-3xl font-bold tabular-nums ${TEXT_PRIMARY}`}>
          {utilization}
          <span className={`text-lg ${TEXT_DIM}`}>%</span>
        </p>
        <p className={`mt-0.5 text-xs ${TEXT_MUTED}`}>Active utilization rate</p>
        {/* Progress bar */}
        <div className={`mt-3 h-1.5 w-full overflow-hidden rounded-full ${BAR_BG}`}>
          <div
            className="h-full rounded-full bg-[#00A8FF] transition-all duration-700"
            style={{ width: `${utilization}%` }}
            role="progressbar"
            aria-valuenow={utilization}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Fleet utilization: ${utilization}%`}
          />
        </div>
      </div>
    </div>
  );
}
