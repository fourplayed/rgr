/**
 * AssetStatBar — 4 mini stat cards: Total, Active, Maintenance, Out of Service
 */
import React from 'react';
import { Package, CheckCircle, Wrench, XCircle } from 'lucide-react';
import { useFleetStatistics } from '@/hooks/useFleetData';

interface StatMiniCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  isDark: boolean;
}

function StatMiniCard({ icon: Icon, label, value, color, isDark }: StatMiniCardProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-transform hover:-translate-y-0.5"
      style={{
        background: isDark ? 'rgba(6, 11, 40, 0.5)' : 'rgba(255, 255, 255, 0.1)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.15)'}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="p-2 rounded-lg"
        style={{ background: `${color}22` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <div
          className="text-2xl font-bold tabular-nums"
          style={{ color: isDark ? '#f8fafc' : '#ffffff', fontFamily: "'Lato', sans-serif" }}
        >
          {value}
        </div>
        <div
          className="text-xs"
          style={{ color: isDark ? 'rgba(148,163,184,0.8)' : 'rgba(255,255,255,0.7)' }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

export interface AssetStatBarProps {
  isDark: boolean;
}

export const AssetStatBar = React.memo<AssetStatBarProps>(({ isDark }) => {
  const { data } = useFleetStatistics();

  const stats = [
    { icon: Package, label: 'Total Assets', value: data?.totalAssets ?? 0, color: '#3b82f6' },
    { icon: CheckCircle, label: 'Active', value: data?.activeAssets ?? 0, color: '#2bbb6e' },
    { icon: Wrench, label: 'Maintenance', value: data?.inMaintenance ?? 0, color: '#e8a020' },
    { icon: XCircle, label: 'Out of Service', value: data?.outOfService ?? 0, color: '#d43050' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => (
        <StatMiniCard key={s.label} {...s} isDark={isDark} />
      ))}
    </div>
  );
});

AssetStatBar.displayName = 'AssetStatBar';
