import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  listAssetCountSessions,
  getAssetCountSession,
  getSessionItemsWithAssets,
  getSessionCombinationMetadata,
  getSessionCombinationPhotos,
} from '@rgr/shared';
import type { ListAssetCountSessionsParams } from '@rgr/shared';

/**
 * Query keys for count history data
 */
export const countHistoryKeys = {
  all: ['countHistory'] as const,
  lists: () => [...countHistoryKeys.all, 'list'] as const,
  list: (filters: Pick<ListAssetCountSessionsParams, 'depotId' | 'page'>) =>
    [...countHistoryKeys.lists(), filters] as const,
  details: () => [...countHistoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...countHistoryKeys.details(), id] as const,
};

/**
 * Fetch paginated list of count sessions for a depot
 */
export function useCountHistorySessions(
  filters: Pick<ListAssetCountSessionsParams, 'depotId' | 'page'>
) {
  return useQuery({
    queryKey: countHistoryKeys.list(filters),
    queryFn: async () => {
      const result = await listAssetCountSessions({
        ...(filters.depotId ? { depotId: filters.depotId } : {}),
        page: filters.page ?? 1,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    enabled: !!filters.depotId,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/**
 * Fetch complete session detail (session + items + metadata + photos) in parallel
 */
export function useCountSessionDetail(sessionId: string | undefined) {
  return useQuery({
    queryKey: countHistoryKeys.detail(sessionId ?? ''),
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID is required');

      const [sessionResult, itemsResult, metadataResult, photosResult] = await Promise.all([
        getAssetCountSession(sessionId),
        getSessionItemsWithAssets(sessionId),
        getSessionCombinationMetadata(sessionId),
        getSessionCombinationPhotos(sessionId),
      ]);

      if (!sessionResult.success) throw new Error(sessionResult.error);
      if (!itemsResult.success) throw new Error(itemsResult.error);
      if (!metadataResult.success) throw new Error(metadataResult.error);
      if (!photosResult.success) throw new Error(photosResult.error);

      return {
        session: sessionResult.data,
        items: itemsResult.data,
        metadata: metadataResult.data,
        photos: photosResult.data,
      };
    },
    enabled: !!sessionId,
    staleTime: 60_000,
  });
}
