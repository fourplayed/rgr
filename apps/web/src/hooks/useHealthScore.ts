/**
 * useHealthScore — React Query hooks for fleet health score data
 *
 * Computes a composite fleet health score from three components:
 *   - Scan compliance (40%): % of assets scanned in last 30 days
 *   - Hazard clearance (40%): % of hazard alerts cleared
 *   - Maintenance currency (20%): % of assets with no overdue maintenance
 *
 * staleTime is 2 minutes — health scores need to be reasonably fresh.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getFleetStatistics,
  getOutstandingAssets,
  getHazardClearanceRate,
  getMaintenanceStats,
  getDepotHealthScores,
} from '@rgr/shared';

// Re-export DepotHealthScoreData for consumer convenience
export type { DepotHealthScoreData } from '@rgr/shared';

/** staleTime for all health score queries: 2 minutes */
const HEALTH_STALE_TIME = 2 * 60 * 1000;

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface HealthScoreData {
  /** Weighted composite score 0-100 */
  overallScore: number;
  /** % of assets scanned in last 30 days (0-100) */
  scanCompliance: number;
  /** % of hazard alerts cleared (0-100) */
  hazardClearance: number;
  /** % of assets with no overdue maintenance (0-100) */
  maintenanceCurrency: number;
  /** 90+ = healthy, 70-89 = attention, <70 = at_risk */
  status: 'healthy' | 'attention' | 'at_risk';
}

// ── Query Keys ────────────────────────────────────────────────────────────────

export const HEALTH_QUERY_KEYS = {
  fleet: () => ['health', 'fleet'] as const,
  depots: () => ['health', 'depots'] as const,
} as const;

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Fleet-wide composite health score.
 *
 * Fetches fleet statistics, outstanding assets, hazard clearance rate, and
 * maintenance stats in parallel, then computes the weighted score.
 */
export function useFleetHealthScore() {
  return useQuery<HealthScoreData>({
    queryKey: HEALTH_QUERY_KEYS.fleet(),
    queryFn: async () => {
      const [statsResult, outstandingResult, hazardResult, maintenanceResult] = await Promise.all([
        getFleetStatistics(),
        getOutstandingAssets(30),
        getHazardClearanceRate(),
        getMaintenanceStats(),
      ]);

      if (!statsResult.success) {
        throw new Error(statsResult.error ?? 'Failed to fetch fleet statistics');
      }
      if (!outstandingResult.success) {
        throw new Error(outstandingResult.error ?? 'Failed to fetch outstanding assets');
      }
      if (!hazardResult.success) {
        throw new Error(hazardResult.error ?? 'Failed to fetch hazard clearance rate');
      }
      if (!maintenanceResult.success) {
        throw new Error(maintenanceResult.error ?? 'Failed to fetch maintenance stats');
      }

      const total = statsResult.data!.totalAssets;
      const outstanding = outstandingResult.data!.length;
      const scanCompliance = total > 0 ? ((total - outstanding) / total) * 100 : 100;

      const hazardClearance = hazardResult.data!;

      const { total: totalRecords, overdue } = maintenanceResult.data!;
      const maintenanceCurrency =
        totalRecords > 0
          ? ((totalRecords - overdue) / totalRecords) * 100
          : 100;

      const overallScore = Math.round(
        scanCompliance * 0.4 + hazardClearance * 0.4 + maintenanceCurrency * 0.2
      );

      const status: HealthScoreData['status'] =
        overallScore >= 90 ? 'healthy' : overallScore >= 70 ? 'attention' : 'at_risk';

      return {
        overallScore,
        scanCompliance: Math.round(scanCompliance),
        hazardClearance: Math.round(hazardClearance),
        maintenanceCurrency: Math.round(maintenanceCurrency),
        status,
      };
    },
    staleTime: HEALTH_STALE_TIME,
  });
}

/**
 * Per-depot health score breakdown.
 */
export function useDepotHealthScores() {
  return useQuery<DepotHealthScoreData[]>({
    queryKey: HEALTH_QUERY_KEYS.depots(),
    queryFn: async () => {
      const result = await getDepotHealthScores();
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to fetch depot health scores');
      }
      return result.data!;
    },
    staleTime: HEALTH_STALE_TIME,
  });
}
