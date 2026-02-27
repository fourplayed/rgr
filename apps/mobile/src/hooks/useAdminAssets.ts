import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteAsset,
  bulkUpdateAssetStatus,
  getAssetRelatedCounts,
} from '@rgr/shared';
import type { AssetStatus } from '@rgr/shared';
import { assetKeys } from './useAssetData';

export function useAssetRelatedCounts(assetId: string | null) {
  return useQuery({
    queryKey: ['admin-asset-counts', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('No asset ID');
      const result = await getAssetRelatedCounts(assetId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!assetId,
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteAsset(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.countsByStatus() });
    },
  });
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: AssetStatus }) => {
      const result = await bulkUpdateAssetStatus(ids, status);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.countsByStatus() });
    },
  });
}
