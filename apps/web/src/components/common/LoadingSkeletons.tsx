/**
 * LoadingSkeletons - Skeleton loading states for lazy-loaded components
 * Improves perceived performance during code splitting
 */
import React from 'react';

interface SkeletonProps {
  className?: string;
  isDark?: boolean;
}

/** Animated skeleton pulse base */
const SkeletonPulse: React.FC<SkeletonProps> = ({ className = '', isDark = true }) => (
  <div
    className={`animate-pulse rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'} ${className}`}
  />
);

/** Map loading skeleton */
export const MapSkeleton: React.FC<SkeletonProps> = ({ className = '', isDark = true }) => (
  <div className={`relative ${className}`} role="status" aria-label="Loading map">
    <SkeletonPulse isDark={isDark} className="absolute inset-0 rounded-xl" />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <div
          className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3 ${isDark ? 'border-blue-500' : 'border-cyan-500'}`}
        />
        <p className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-500'}`}>Loading map...</p>
      </div>
    </div>
  </div>
);

/** Dashboard page skeleton */
export const DashboardSkeleton: React.FC<SkeletonProps> = ({ isDark = true }) => (
  <div className="min-h-screen flex flex-col" role="status" aria-label="Loading dashboard">
    {/* Nav skeleton */}
    <div
      className={`h-[66px] border-b ${isDark ? 'bg-navy-900/50 border-white/10' : 'bg-white border-slate-200'}`}
    >
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonPulse key={i} isDark={isDark} className="h-4 w-20" />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <SkeletonPulse isDark={isDark} className="h-6 w-6 rounded-full" />
          <SkeletonPulse isDark={isDark} className="h-6 w-6 rounded-full" />
        </div>
      </div>
    </div>

    {/* Content skeleton */}
    <main className="flex-1 pt-10 px-6">
      <div className="max-w-[1630px] mx-auto">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonPulse key={i} isDark={isDark} className="h-[140px] rounded-2xl" />
          ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <SkeletonPulse isDark={isDark} className="h-[400px] rounded-2xl" />
          </div>
          <div className="space-y-6">
            <SkeletonPulse isDark={isDark} className="h-[350px] rounded-2xl" />
            <SkeletonPulse isDark={isDark} className="h-[200px] rounded-2xl" />
          </div>
        </div>
      </div>
    </main>
  </div>
);

/** Scan page skeleton */
export const ScanSkeleton: React.FC<SkeletonProps> = ({ isDark = true }) => (
  <div
    className="min-h-screen flex flex-col items-center justify-center p-4"
    role="status"
    aria-label="Loading scanner"
  >
    <div className="w-full max-w-md">
      <SkeletonPulse isDark={isDark} className="h-[300px] rounded-2xl mb-4" />
      <SkeletonPulse isDark={isDark} className="h-12 rounded-xl mb-2" />
      <SkeletonPulse isDark={isDark} className="h-12 rounded-xl" />
    </div>
  </div>
);

/** Card skeleton */
export const CardSkeleton: React.FC<SkeletonProps & { height?: string }> = ({
  className = '',
  isDark = true,
  height = 'h-[200px]',
}) => (
  <div className={`rounded-2xl overflow-hidden ${className}`} role="status" aria-label="Loading">
    <SkeletonPulse isDark={isDark} className={`w-full ${height}`} />
  </div>
);

/** Activity list skeleton */
export const ActivityListSkeleton: React.FC<SkeletonProps> = ({
  className = '',
  isDark = true,
}) => (
  <div
    className={`rounded-2xl overflow-hidden ${className}`}
    role="status"
    aria-label="Loading activity"
  >
    <div className={`p-5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
      <SkeletonPulse isDark={isDark} className="h-5 w-32" />
    </div>
    <div className="p-5 space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-4">
          <SkeletonPulse isDark={isDark} className="w-3 h-3 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonPulse isDark={isDark} className="h-4 w-24" />
            <SkeletonPulse isDark={isDark} className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default {
  MapSkeleton,
  DashboardSkeleton,
  ScanSkeleton,
  CardSkeleton,
  ActivityListSkeleton,
};
