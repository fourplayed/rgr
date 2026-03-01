import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAsset,
  updateAsset,
  deleteAsset,
  bulkUpdateAssetStatus,
  getAssetRelatedCounts,
  generateQRCodeData,
} from '@rgr/shared';
import type { AssetStatus, CreateAssetInput } from '@rgr/shared';
import { assetKeys } from './useAssetData';
import { logger } from '../utils/logger';

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

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAssetInput) => {
      const result = await createAsset(input);
      if (!result.success) throw new Error(result.error);
      const asset = result.data;

      // Assign QR code to newly created asset
      try {
        const qrResult = await updateAsset(asset.id, {
          qrCodeData: generateQRCodeData(asset.id),
          qrGeneratedAt: new Date().toISOString(),
        });
        if (!qrResult.success) {
          logger.warn('QR code assignment failed:', qrResult.error);
        }
      } catch (e) {
        logger.warn('QR code assignment failed:', e);
      }

      return asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.countsByStatus() });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteAsset(id);
      if (!result.success) throw new Error(result.error);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.countsByStatus() });
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(deletedId) });
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
