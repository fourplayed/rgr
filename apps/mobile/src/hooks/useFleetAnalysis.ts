import { useQuery } from '@tanstack/react-query';
import { getLatestFleetAnalysis, getUserActionSummary, queryFromService } from '@rgr/shared';

/**
 * Query keys for fleet analysis data
 */
export const fleetAnalysisKeys = {
  latest: ['fleetAnalysis', 'latest'] as const,
  userSummary: (userId: string) => ['fleetAnalysis', 'userSummary', userId] as const,
};

/**
 * Fetch the latest successful AI fleet analysis.
 * staleTime 30 min — analysis only changes once per day via cron.
 */
export function useLatestFleetAnalysis() {
  return useQuery({
    queryKey: fleetAnalysisKeys.latest,
    queryFn: queryFromService(() => getLatestFleetAnalysis()),
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch the current user's 24h action summary.
 * staleTime 1 min — user's own activity changes throughout the day.
 */
export function useUserActionSummary(userId: string | undefined) {
  return useQuery({
    queryKey: fleetAnalysisKeys.userSummary(userId ?? ''),
    queryFn: queryFromService(() => getUserActionSummary(userId!)),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
