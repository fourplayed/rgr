/**
 * FleetHealthScorePresenter — pure presentational component for the Fleet Health Score widget.
 *
 * Shows a RadialBarChart gauge of the overall fleet health score,
 * component breakdown rows, and a "By Depot" toggle.
 */
import React, { useState } from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import type { HealthScoreData, DepotHealthScoreData } from '@/hooks/useHealthScore';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FleetHealthScorePresenterProps {
  data: HealthScoreData | undefined;
  depotScores: DepotHealthScoreData[] | undefined;
  isLoading: boolean;
  onNavigateToReports: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  healthy: '#22c55e', // green-500
  attention: '#f59e0b', // amber-500
  at_risk: '#ef4444', // red-500
} as const;

const STATUS_TEXT_CLASSES = {
  healthy: 'text-green-400',
  attention: 'text-amber-400',
  at_risk: 'text-red-400',
} as const;

// ── Sub-components ─────────────────────────────────────────────────────────────

interface ScoreBarProps {
  value: number;
  color: string;
}

const ScoreBar: React.FC<ScoreBarProps> = ({ value, color }) => (
  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full">
    <div
      className="h-full rounded-full transition-all duration-700"
      style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
    />
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────

export const FleetHealthScorePresenter: React.FC<FleetHealthScorePresenterProps> = ({
  data,
  depotScores,
  isLoading,
  onNavigateToReports,
}) => {
  const [showDepots, setShowDepots] = useState(false);

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div
        data-testid="fleet-health-skeleton"
        className="animate-pulse relative rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 shadow-glass"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="h-4 w-28 rounded bg-white/10" />
          <div className="h-4 w-20 rounded bg-white/10" />
        </div>
        <div className="h-48 rounded-xl bg-white/5 mb-4" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex justify-between items-center gap-3">
              <div className="h-3 w-32 rounded bg-white/10" />
              <div className="h-3 w-8 rounded bg-white/10" />
              <div className="h-1.5 flex-1 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Derived values ──
  const score = data?.overallScore ?? null;
  const status = data?.status ?? 'at_risk';
  const scoreColor = STATUS_COLORS[status];
  const scoreTextClass = STATUS_TEXT_CLASSES[status];
  const gaugeData = [{ value: score ?? 0 }];

  // ── Rendered ──
  return (
    <div
      className="relative rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 shadow-glass hover:shadow-glass-hover transition-shadow duration-300"
      role="region"
      aria-label="Fleet Health Score"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Fleet Health
        </h3>
        <button
          data-testid="view-reports-link"
          onClick={onNavigateToReports}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors duration-150 flex items-center gap-1"
          aria-label="View Reports"
        >
          View Reports →
        </button>
      </div>

      {/* Gauge */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <RadialBarChart
            innerRadius="60%"
            outerRadius="80%"
            data={gaugeData}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              fill={scoreColor}
              background={{ fill: '#1a2035' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            data-testid="fleet-health-score-value"
            className={`text-4xl font-bold tabular-nums ${scoreTextClass}`}
          >
            {score !== null ? score : '—'}
          </span>
          <span className="text-xs text-slate-400 mt-1">/ 100</span>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex justify-end mb-3">
        <button
          data-testid="by-depot-toggle"
          onClick={() => setShowDepots((prev) => !prev)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors duration-150 ${
            showDepots
              ? 'border-blue-500/60 bg-blue-500/20 text-blue-300'
              : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-300'
          }`}
          aria-pressed={showDepots}
        >
          By Depot
        </button>
      </div>

      {/* Lower section */}
      {showDepots ? (
        // Depot scores list
        <ul data-testid="depot-scores" className="space-y-2">
          {(depotScores ?? []).map((depot) => {
            const depotColor =
              depot.overallScore >= 90
                ? STATUS_COLORS.healthy
                : depot.overallScore >= 70
                  ? STATUS_COLORS.attention
                  : STATUS_COLORS.at_risk;
            return (
              <li key={depot.depotId} className="flex items-center gap-3">
                <span className="text-xs text-slate-300 w-28 truncate">{depot.depotName}</span>
                <span
                  data-testid={`depot-score-${depot.depotId}`}
                  className="text-xs font-semibold tabular-nums w-8 text-right"
                  style={{ color: depotColor }}
                >
                  {Math.round(depot.overallScore)}
                </span>
                <div className="flex-1">
                  <ScoreBar value={depot.overallScore} color={depotColor} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        // Component scores
        <ul data-testid="component-scores" className="space-y-2">
          <li className="flex items-center gap-3">
            <span className="text-xs text-slate-300 w-40">Scan Compliance</span>
            <span
              data-testid="score-scan-compliance"
              className="text-xs font-semibold tabular-nums w-8 text-right text-slate-200"
            >
              {data?.scanCompliance ?? '—'}
            </span>
            <div className="flex-1">
              <ScoreBar value={data?.scanCompliance ?? 0} color={scoreColor} />
            </div>
            <span className="text-xs text-slate-500 w-8">40%</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="text-xs text-slate-300 w-40">Hazard Clearance</span>
            <span
              data-testid="score-hazard-clearance"
              className="text-xs font-semibold tabular-nums w-8 text-right text-slate-200"
            >
              {data?.hazardClearance ?? '—'}
            </span>
            <div className="flex-1">
              <ScoreBar value={data?.hazardClearance ?? 0} color={scoreColor} />
            </div>
            <span className="text-xs text-slate-500 w-8">40%</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="text-xs text-slate-300 w-40">Maintenance Currency</span>
            <span
              data-testid="score-maintenance-currency"
              className="text-xs font-semibold tabular-nums w-8 text-right text-slate-200"
            >
              {data?.maintenanceCurrency ?? '—'}
            </span>
            <div className="flex-1">
              <ScoreBar value={data?.maintenanceCurrency ?? 0} color={scoreColor} />
            </div>
            <span className="text-xs text-slate-500 w-8">20%</span>
          </li>
        </ul>
      )}
    </div>
  );
};

export default FleetHealthScorePresenter;
