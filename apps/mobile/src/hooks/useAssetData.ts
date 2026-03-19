import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
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
  queryFromService,
  queryFromPaginatedService,
} from '@rgr/shared';
import type { AssetStatus, AssetCategory, AssetSortField, UpdateAssetInput } from '@rgr/shared';
import { useMutationFromService } from './useMutationFromService';

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
        sortField: AssetSortField;
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
    maxPages: 10,
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
  enabled?: boolean;
}) {
  // Exclude `enabled` from query key to preserve cache identity
  const { enabled, ...queryFilters } = filters ?? {};
  return useQuery({
    queryKey: assetKeys.list(Object.keys(queryFilters).length > 0 ? queryFilters : undefined),
    staleTime: 30_000,
    enabled: enabled ?? true,
    queryFn: async () => {
      const params: {
        page: number;
        pageSize: number;
        statuses?: AssetStatus[];
        categories?: AssetCategory[];
        depotIds?: string[];
        search?: string;
        sortField: AssetSortField;
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
    queryFn: queryFromService(() => getAsset(id!)),
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
    queryFn: queryFromPaginatedService(() => getAssetScans(assetId!, 1, 20)),
    enabled: !!assetId,
    staleTime: 30000,
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
    queryFn: queryFromPaginatedService(() => getAssetMaintenance(assetId!, 1, 20)),
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
    queryFn: queryFromPaginatedService(() => getAssetHazards(assetId!)),
    enabled: !!assetId,
  });
}

/**
 * Fetch current user's recent scans
 */
export function useMyRecentScans(userId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.myScans(userId ?? ''),
    queryFn: queryFromService(() => getMyRecentScans(userId!)),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/**
 * Fetch recent scans across all users (global activity)
 */
export function useRecentScans(limit: number = 10) {
  return useQuery({
    queryKey: assetKeys.recentScans(limit),
    queryFn: queryFromService(() => getRecentScans(limit)),
    staleTime: 30_000,
  });
}

/**
 * Fetch total scan count using server-side COUNT
 */
export function useTotalScanCount() {
  return useQuery({
    queryKey: assetKeys.totalScanCount(),
    queryFn: queryFromService(() => getTotalScanCount()),
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
  return useMutationFromService({
    serviceFn: createScanEvent,
    invalidates: (data, vars) => [
      assetKeys.scans(vars.assetId),
      assetKeys.detail(vars.assetId),
      assetKeys.recentScans(),
      assetKeys.totalScanCount(),
      assetKeys.scanContext(vars.assetId),
    ],
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
  return useMutationFromService({
    serviceFn: ({ id, input }: { id: string; input: UpdateAssetInput }) => updateAsset(id, input),
    invalidates: (data) => [assetKeys.detail(data.id), assetKeys.lists()],
  });
}

/**
 * Fetch mechanic scan context (open defects/tasks + counts) for an asset.
 * Single round-trip via the `get_asset_scan_context` RPC.
 */
export function useAssetScanContext(assetId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.scanContext(assetId ?? ''),
    queryFn: queryFromService(() => getAssetScanContext(assetId!)),
    enabled: !!assetId,
    staleTime: 10_000, // Short stale time — context card should stay fresh
  });
}

/**
 * Delete a scan event (undo support).
 * RLS limits this to the scanner's own recent scans (< 30s old).
 */
export function useDeleteScanEvent() {
  return useMutationFromService({
    serviceFn: ({ scanEventId }: { scanEventId: string; assetId: string }) =>
      deleteScanEvent(scanEventId),
    invalidates: (_data, vars) => [
      assetKeys.scans(vars.assetId),
      assetKeys.detail(vars.assetId),
      assetKeys.recentScans(),
      assetKeys.totalScanCount(),
      assetKeys.scanContext(vars.assetId),
    ],
  });
}
