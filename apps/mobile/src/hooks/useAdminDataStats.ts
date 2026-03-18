import { useQuery } from '@tanstack/react-query';
import { queryFromService } from '@rgr/shared';
import { getAdminDataStats } from '@rgr/shared/admin';

export const adminDataStatsKeys = {
  all: ['admin-data-stats'] as const,
};

export function useAdminDataStats() {
  return useQuery({
    queryKey: adminDataStatsKeys.all,
    queryFn: queryFromService(() => getAdminDataStats()),
    staleTime: 30_000,
  });
}
