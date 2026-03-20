/**
 * useHealthScore — React Query hooks for fleet health score data
 *
 * Computes a composite fleet health score from three components:
 *   - Scan compliance (40%): % of assets scanned in last 30 days
 *   - Hazard clearance (40%): % of hazard alerts cleared
 *   - Maintenance currency (20%): % of assets with no overdue maintenance
 *
 * staleTime is 2 minutes — health scores need to be reasonably fresh.
 *
 * When the fleet or depot health score drops below 70%, a notification is
 * inserted (deduped by checking if a same-day notification already exists).
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getFleetStatistics,
  getOutstandingAssets,
  getHazardClearanceRate,
  getMaintenanceStats,
  getDepotHealthScores,
  createNotification,
  getNotifications,
} from '@rgr/shared';
import type { DepotHealthScoreData, Notification, NotificationType } from '@rgr/shared';
import { useAuthStore } from '@/stores/authStore';

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

// ── Deduplication helper ──────────────────────────────────────────────────────

/**
 * Returns true if a same-day notification of the given type already exists.
 * For fleet notifications (no resourceId), matches on resourceType === 'fleet'.
 * For depot notifications, matches on resourceId === depotId.
 */
function isSameDayNotification(
  notifications: Notification[],
  type: NotificationType,
  resourceId?: string
): boolean {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  return notifications.some(
    (n) =>
      n.type === type &&
      n.createdAt.slice(0, 10) === today &&
      (resourceId ? n.resourceId === resourceId : n.resourceType === 'fleet')
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Fleet-wide composite health score.
 *
 * Fetches fleet statistics, outstanding assets, hazard clearance rate, and
 * maintenance stats in parallel, then computes the weighted score.
 *
 * Side effect: when the score drops below 70, triggers a notification insert
 * (fire-and-forget, deduped per calendar day).
 */
export function useFleetHealthScore() {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const query = useQuery<HealthScoreData>({
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
        totalRecords > 0 ? ((totalRecords - overdue) / totalRecords) * 100 : 100;

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

  // Fire-and-forget notification trigger when score drops below 70
  useEffect(() => {
    const data = query.data;
    if (!data || data.overallScore >= 70 || !userId) return;

    const { overallScore } = data;

    void (async () => {
      try {
        const notifResult = await getNotifications();
        if (!notifResult.success || !notifResult.data) return;

        if (isSameDayNotification(notifResult.data, 'health_score')) return;

        await createNotification({
          userId,
          type: 'health_score',
          title: 'Fleet Health At Risk',
          body: `Fleet health score has dropped to ${overallScore}%`,
          resourceType: 'fleet',
        });
      } catch (err) {
        console.warn('[useFleetHealthScore] Failed to create health score notification:', err);
      }
    })();
  }, [query.data, userId]);

  return query;
}

/**
 * Per-depot health score breakdown.
 *
 * Side effect: for each depot whose score drops below 70, triggers a
 * notification insert (fire-and-forget, deduped per calendar day per depot).
 */
export function useDepotHealthScores() {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const query = useQuery<DepotHealthScoreData[]>({
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

  // Fire-and-forget notification triggers for depots below 70
  useEffect(() => {
    const depots = query.data;
    if (!depots || depots.length === 0 || !userId) return;

    const atRiskDepots = depots.filter((d) => d.overallScore < 70);
    if (atRiskDepots.length === 0) return;

    void (async () => {
      try {
        const notifResult = await getNotifications();
        if (!notifResult.success || !notifResult.data) return;
        const existingNotifications = notifResult.data;

        for (const depot of atRiskDepots) {
          if (isSameDayNotification(existingNotifications, 'health_score', depot.depotId)) {
            continue;
          }

          await createNotification({
            userId,
            type: 'health_score',
            title: `Depot Health At Risk: ${depot.depotName}`,
            body: `${depot.depotName} health score has dropped to ${depot.overallScore}%`,
            resourceId: depot.depotId,
            resourceType: 'depot',
          });
        }
      } catch (err) {
        console.warn('[useDepotHealthScores] Failed to create health score notification:', err);
      }
    })();
  }, [query.data, userId]);

  return query;
}
