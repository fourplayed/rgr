import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAssets,
  getAsset,
  getAssetScans,
  getMyRecentScans,
  getRecentScans,
  createScanEvent,
  deleteScanEvent,
  getAssetMaintenance,
  getAssetHazards,
  getAssetCountsByStatus,
  getTotalScanCount,
  updateAsset,
  getAssetScanContext,
} from '@rgr/shared';
import type {
  AssetStatus,
  AssetCategory,
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
    categories?: AssetCategory[];
    depotIds?: string[];
    search?: string;
  }) => [...assetKeys.lists(), filters] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  scans: (id: string) => [...assetKeys.detail(id), 'scans'] as const,
  maintenance: (id: string) => [...assetKeys.detail(id), 'maintenance'] as const,
  hazards: (id: string) => [...assetKeys.detail(id), 'hazards'] as const,
  byQRCode: (qrData: string) => [...assetKeys.all, 'qr', qrData] as const,
  infinite: (filters?: {
    statuses?: AssetStatus[];
    categories?: AssetCategory[];
    depotIds?: string[];
    search?: string;
  }) => [...assetKeys.lists(), 'infinite', filters] as const,
  myScans: (userId: string) => ['scans', 'my', userId] as const,
  recentScans: (limit?: number) => ['scans', 'recent', limit] as const,
  countsByStatus: () => [...assetKeys.all, 'countsByStatus'] as const,
  totalScanCount: () => ['scans', 'totalCount'] as const,
  scanContext: (assetId: string) => [...assetKeys.all, 'scanContext', assetId] as const,
};

/**
 * Cursor-based infinite list of assets.
 * More efficient than offset pagination for large datasets —
 * Postgres can use an index to start at the cursor instead of scanning.
 */

interface AssetCursor {
  sortValue: string;
  id: string;
}

export function useInfiniteAssetList(filters?: {
  pageSize?: number;
  statuses?: AssetStatus[];
  categories?: AssetCategory[];
  depotIds?: string[];
  search?: string;
}) {
  const pageSize = filters?.pageSize ?? 20;

  return useInfiniteQuery({
    queryKey: assetKeys.infinite(filters),
    queryFn: async ({ pageParam }) => {
      const params: {
        pageSize: number;
        statuses?: AssetStatus[];
        categories?: AssetCategory[];
        depotIds?: string[];
        search?: string;
        cursor?: string;
        cursorId?: string;
        sortField: string;
        sortDirection: 'asc' | 'desc';
      } = {
        pageSize,
        sortField: 'assetNumber',
        sortDirection: 'asc',
      };

      if (filters?.statuses) params.statuses = filters.statuses;
      if (filters?.categories) params.categories = filters.categories;
      if (filters?.depotIds) params.depotIds = filters.depotIds;
      if (filters?.search) params.search = filters.search;

      if (pageParam) {
        params.cursor = pageParam.sortValue;
        params.cursorId = pageParam.id;
      }

      const result = await listAssets(params);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: undefined as AssetCursor | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.data.length === 0) return undefined;
      const lastItem = lastPage.data[lastPage.data.length - 1];
      if (!lastItem) return undefined;
      return { sortValue: lastItem.assetNumber, id: lastItem.id };
    },
    staleTime: 30_000,
  });
}

// Note: depotKeys and useDepots are defined in useDepots.ts
// Import from there to avoid duplication

/**
 * Fetch paginated list of assets
 */
export function useAssetList(filters?: {
  page?: number;
  pageSize?: number;
  statuses?: AssetStatus[];
  categories?: AssetCategory[];
  depotIds?: string[];
  search?: string;
}) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    staleTime: 30_000,
    queryFn: async () => {
      const params: {
        page: number;
        pageSize: number;
        statuses?: AssetStatus[];
        categories?: AssetCategory[];
        depotIds?: string[];
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
      if (filters?.categories !== undefined) {
        params.categories = filters.categories;
      }
      if (filters?.depotIds !== undefined) {
        params.depotIds = filters.depotIds;
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

// useDepots is now exported from useDepots.ts - import from there
export { useDepots } from './useDepots';

/**
 * Fetch single asset details
 */
export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: assetKeys.detail(id ?? ''),
    staleTime: 30_000,
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
 * Fetch recent asset scan history (page 1, up to 20 items).
 * This is a preview query for the asset detail screen — not a full paginated list.
 */
export function useAssetScans(assetId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.scans(assetId ?? ''),
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID is required');

      const result = await getAssetScans(assetId, 1, 20);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data.data;
    },
    enabled: !!assetId,
    staleTime: 30000, // Cache for 30 seconds - scans don't change frequently
  });
}

/**
 * Fetch recent asset maintenance records (page 1, up to 20 items).
 * This is a preview query for the asset detail screen — not a full paginated list.
 */
export function useAssetMaintenance(assetId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.maintenance(assetId ?? ''),
    staleTime: 30_000,
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID is required');

      const result = await getAssetMaintenance(assetId, 1, 20);

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
    staleTime: 30_000,
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
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Fetch recent scans across all users (global activity)
 */
export function useRecentScans(limit: number = 10) {
  return useQuery({
    queryKey: assetKeys.recentScans(limit),
    queryFn: async () => {
      const result = await getRecentScans(limit);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Fetch total scan count using server-side COUNT
 */
export function useTotalScanCount() {
  return useQuery({
    queryKey: assetKeys.totalScanCount(),
    queryFn: async () => {
      const result = await getTotalScanCount();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    // Full table COUNT(*) on scan_events is expensive on large tables.
    // 5 minutes is acceptable for a dashboard statistic.
    staleTime: 5 * 60 * 1000,
  });
}

// useAssetByQRCode has been replaced by direct queryClient.fetchQuery usage
// in useScanFlow.ts — see assetKeys.byQRCode for the cache key

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
      // Mark detail stale but don't refetch yet — the subsequent useUpdateAsset.onSuccess
      // will trigger the single refetch, avoiding a double network request.
      queryClient.invalidateQueries({
        queryKey: assetKeys.detail(variables.assetId),
        refetchType: 'none',
      });
      // Mark other queries stale without immediate refetch — they will refetch when the
      // user navigates to the relevant screen. This avoids unnecessary network requests.
      queryClient.invalidateQueries({
        queryKey: assetKeys.scans(variables.assetId),
        refetchType: 'none',
      });
      queryClient.invalidateQueries({
        queryKey: assetKeys.recentScans(),
        refetchType: 'none',
      });
      if (variables.scannedBy) {
        queryClient.invalidateQueries({
          queryKey: assetKeys.myScans(variables.scannedBy),
          refetchType: 'none',
        });
      }
      queryClient.invalidateQueries({
        queryKey: assetKeys.totalScanCount(),
        refetchType: 'none',
      });
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(),
        refetchType: 'none',
      });
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
    staleTime: 60_000, // Dashboard stat — doesn't change rapidly
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
      // Detail query gets immediate refetch, lists marked stale without refetch
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(data.id) });
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(),
        refetchType: 'none',
      });
    },
  });
}

/**
 * Fetch mechanic scan context (open defects/tasks + counts) for an asset.
 * Single round-trip via the `get_asset_scan_context` RPC.
 */
export function useAssetScanContext(assetId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.scanContext(assetId ?? ''),
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID is required');
      const result = await getAssetScanContext(assetId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!assetId,
    staleTime: 10_000, // Short stale time — context card should stay fresh
  });
}

/**
 * Delete a scan event (undo support).
 * RLS limits this to the scanner's own recent scans (< 30s old).
 */
export function useDeleteScanEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scanEventId }: { scanEventId: string; assetId: string }) => {
      const result = await deleteScanEvent(scanEventId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (_data, variables) => {
      // Mark all scan-related queries stale
      queryClient.invalidateQueries({ queryKey: assetKeys.lists(), refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: ['scans'], refetchType: 'none' });
      // Invalidate asset-specific caches so detail screen auto-updates
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId), refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: assetKeys.scans(variables.assetId), refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: assetKeys.scanContext(variables.assetId), refetchType: 'none' });
    },
  });
}
