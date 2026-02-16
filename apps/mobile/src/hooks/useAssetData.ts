import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAssets,
  getAsset,
  getAssetScans,
  getAssetByQRCode,
  getMyRecentScans,
  createScanEvent,
  getAssetMaintenance,
  getAssetHazards,
} from '@rgr/shared';
import type {
  Asset,
  ScanEvent,
  MaintenanceRecord,
  HazardAlert,
  AssetStatus,
  CreateScanEventInput,
} from '@rgr/shared';

/**
 * Query keys for asset-related data
 */
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters?: {
    page?: number;
    pageSize?: number;
    statuses?: AssetStatus[];
    search?: string;
  }) => [...assetKeys.lists(), filters] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  scans: (id: string) => [...assetKeys.detail(id), 'scans'] as const,
  maintenance: (id: string) => [...assetKeys.detail(id), 'maintenance'] as const,
  hazards: (id: string) => [...assetKeys.detail(id), 'hazards'] as const,
  myScans: (userId: string) => ['scans', 'my', userId] as const,
};

/**
 * Fetch paginated list of assets
 */
export function useAssetList(filters?: {
  page?: number;
  pageSize?: number;
  statuses?: AssetStatus[];
  search?: string;
}) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: async () => {
      const result = await listAssets({
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 20,
        statuses: filters?.statuses,
        search: filters?.search,
        sortField: 'assetNumber',
        sortDirection: 'asc',
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data!;
    },
  });
}

/**
 * Fetch single asset details
 */
export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: assetKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) throw new Error('Asset ID is required');

      const result = await getAsset(id);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    enabled: !!id,
  });
}

/**
 * Fetch asset scan history
 */
export function useAssetScans(assetId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.scans(assetId ?? ''),
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID is required');

      const result = await getAssetScans(assetId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data?.data ?? [];
    },
    enabled: !!assetId,
  });
}

/**
 * Fetch asset maintenance records
 */
export function useAssetMaintenance(assetId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.maintenance(assetId ?? ''),
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID is required');

      const result = await getAssetMaintenance(assetId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data?.data ?? [];
    },
    enabled: !!assetId,
  });
}

/**
 * Fetch asset hazard alerts
 */
export function useAssetHazards(assetId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.hazards(assetId ?? ''),
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID is required');

      const result = await getAssetHazards(assetId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data?.data ?? [];
    },
    enabled: !!assetId,
  });
}

/**
 * Fetch current user's recent scans
 */
export function useMyRecentScans(userId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.myScans(userId ?? ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const result = await getMyRecentScans(userId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    },
    enabled: !!userId,
  });
}

/**
 * Lookup asset by QR code
 */
export function useAssetByQRCode() {
  return useMutation({
    mutationFn: async (qrData: string) => {
      const result = await getAssetByQRCode(qrData);

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.data) {
        throw new Error('Asset not found');
      }

      return result.data;
    },
  });
}

/**
 * Create scan event
 */
export function useCreateScanEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateScanEventInput) => {
      const result = await createScanEvent(input);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.scans(variables.assetId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.myScans(variables.scannedBy) });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}
