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
  getAssetCountsByStatus,
  updateAsset,
} from '@rgr/shared';
import type {
  AssetStatus,
  CreateScanEventInput,
  UpdateAssetInput,
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
  countsByStatus: () => [...assetKeys.all, 'countsByStatus'] as const,
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
      const params: {
        page: number;
        pageSize: number;
        statuses?: AssetStatus[];
        search?: string;
        sortField: string;
        sortDirection: 'asc' | 'desc';
      } = {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 20,
        sortField: 'assetNumber',
        sortDirection: 'asc',
      };

      if (filters?.statuses !== undefined) {
        params.statuses = filters.statuses;
      }
      if (filters?.search !== undefined) {
        params.search = filters.search;
      }

      const result = await listAssets(params);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
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

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
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

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data.data;
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

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data.data;
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

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data.data;
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

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
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

      if (!result.success) {
        throw new Error(result.error);
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

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.scans(variables.assetId) });
      if (variables.scannedBy) {
        queryClient.invalidateQueries({ queryKey: assetKeys.myScans(variables.scannedBy) });
      }
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

/**
 * Fetch asset counts by status using server-side RPC
 * More efficient than multiple filtered queries
 */
export function useAssetCountsByStatus() {
  return useQuery({
    queryKey: assetKeys.countsByStatus(),
    queryFn: async () => {
      const result = await getAssetCountsByStatus();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Convert to a map for easy access
      const counts: Record<string, number> = {};
      let total = 0;
      for (const item of result.data) {
        counts[item.status] = item.count;
        total += item.count;
      }

      return {
        counts,
        total,
        serviced: counts['serviced'] ?? 0,
        maintenance: counts['maintenance'] ?? 0,
        outOfService: counts['out_of_service'] ?? 0,
      };
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Update asset
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateAssetInput }) => {
      const result = await updateAsset(id, input);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}
