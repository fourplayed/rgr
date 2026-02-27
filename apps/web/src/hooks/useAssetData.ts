/**
 * useAssetData — React Query hooks for asset CRUD + realtime
 *
 * Follows the same pattern as useFleetData.ts:
 * - Hierarchical query keys for granular invalidation
 * - Individual hooks per data type
 * - Mutation hooks with cache invalidation
 * - Realtime subscription hook
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import {
  getSupabaseClient,
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  softDeleteAsset,
  getAssetScans,
  getAssetMaintenance,
  getAssetHazards,
  listDepots,
  buildDepotLookups,
  queryFromService,
} from '@rgr/shared';
import type {
  AssetWithRelations,
  CreateAssetInput,
  UpdateAssetInput,
} from '@rgr/shared';
import type { AssetFilters, AssetSort, AssetPagination } from '@/pages/assets/types';
import { FLEET_QUERY_KEYS } from './useFleetData';

// ── Query Keys ──

export const ASSET_QUERY_KEYS = {
  all: ['assets'] as const,
  lists: () => [...ASSET_QUERY_KEYS.all, 'list'] as const,
  list: (filters: AssetFilters, sort: AssetSort, pagination: AssetPagination) =>
    [...ASSET_QUERY_KEYS.lists(), filters, sort, pagination] as const,
  details: () => [...ASSET_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ASSET_QUERY_KEYS.details(), id] as const,
  scans: (assetId: string, page: number) =>
    [...ASSET_QUERY_KEYS.all, 'scans', assetId, page] as const,
  maintenance: (assetId: string, page: number) =>
    [...ASSET_QUERY_KEYS.all, 'maintenance', assetId, page] as const,
  hazards: (assetId: string, page: number) =>
    [...ASSET_QUERY_KEYS.all, 'hazards', assetId, page] as const,
  depots: ['depots'] as const,
} as const;

// ── Read Hooks ──

/**
 * Paginated, filtered, sorted asset list
 */
export function useAssets(
  filters: AssetFilters,
  sort: AssetSort,
  pagination: AssetPagination,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ASSET_QUERY_KEYS.list(filters, sort, pagination),
    queryFn: queryFromService(() => {
      const params: Parameters<typeof listAssets>[0] = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortField: sort.field,
        sortDirection: sort.direction,
      };
      if (filters.search) params.search = filters.search;
      if (filters.statuses.length > 0) params.statuses = filters.statuses;
      if (filters.categories.length > 0) params.categories = filters.categories;
      if (filters.depotIds.length > 0) params.depotIds = filters.depotIds;
      if (filters.hasLocation != null) params.hasLocation = filters.hasLocation;
      return listAssets(params);
    }),
    staleTime: 60 * 1000,
    enabled,
  });
}

/**
 * Single asset with joined relations
 */
export function useAsset(id: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ASSET_QUERY_KEYS.detail(id ?? ''),
    queryFn: queryFromService(() => getAsset(id!)),
    enabled: enabled && !!id,
  });
}

/**
 * Scan events for an asset
 */
export function useAssetScans(
  assetId: string | null,
  page: number = 1,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ASSET_QUERY_KEYS.scans(assetId ?? '', page),
    queryFn: queryFromService(() => getAssetScans(assetId!, page)),
    enabled: enabled && !!assetId,
  });
}

/**
 * Maintenance records for an asset
 */
export function useAssetMaintenance(
  assetId: string | null,
  page: number = 1,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ASSET_QUERY_KEYS.maintenance(assetId ?? '', page),
    queryFn: queryFromService(() => getAssetMaintenance(assetId!, page)),
    enabled: enabled && !!assetId,
  });
}

/**
 * Hazard alerts for an asset
 */
export function useAssetHazards(
  assetId: string | null,
  page: number = 1,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ASSET_QUERY_KEYS.hazards(assetId ?? '', page),
    queryFn: queryFromService(() => getAssetHazards(assetId!, page)),
    enabled: enabled && !!assetId,
  });
}

/**
 * List all active depots (for filter dropdowns)
 */
export function useDepots(enabled: boolean = true) {
  return useQuery({
    queryKey: ASSET_QUERY_KEYS.depots,
    queryFn: queryFromService(() => listDepots()),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

/**
 * Memoized depot lookups with helper methods
 */
export function useDepotLookup() {
  const { data: depots = [] } = useDepots();

  return useMemo(() => {
    const { byCode, byName } = buildDepotLookups(depots);
    return {
      depots,
      byCode,
      byName,
      getColor: (code: string, fallback = '#9ca3af') =>
        byCode.get(code.toLowerCase())?.color ?? fallback,
      getName: (code: string) =>
        byCode.get(code.toLowerCase())?.name ?? code.toUpperCase(),
    };
  }, [depots]);
}

// ── Mutation Hooks ──

/**
 * Create a new asset
 */
export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAssetInput) => {
      const result = await createAsset(input);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSET_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: FLEET_QUERY_KEYS.statistics() });
    },
  });
}

/**
 * Update an existing asset
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateAssetInput }) => {
      const result = await updateAsset(id, input);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (data, { id }) => {
      // Optimistic update the detail cache
      queryClient.setQueryData(ASSET_QUERY_KEYS.detail(id), (old: AssetWithRelations | undefined) => {
        if (!old) return old;
        return { ...old, ...data };
      });
      queryClient.invalidateQueries({ queryKey: ASSET_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: FLEET_QUERY_KEYS.statistics() });
    },
  });
}

/**
 * Soft-delete an asset
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await softDeleteAsset(id);
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSET_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: FLEET_QUERY_KEYS.statistics() });
    },
  });
}

// ── Realtime Hook ──

/**
 * Subscribe to realtime changes on assets, scan_events, hazard_alerts.
 * Invalidates React Query cache on changes.
 */
export function useAssetsRealtime(enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseClient();

    const assetSub = supabase
      .channel('assets-page-assets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assets' },
        () => {
          queryClient.invalidateQueries({ queryKey: ASSET_QUERY_KEYS.all });
          queryClient.invalidateQueries({ queryKey: FLEET_QUERY_KEYS.statistics() });
        }
      )
      .subscribe();

    const scanSub = supabase
      .channel('assets-page-scans')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_events' },
        () => {
          queryClient.invalidateQueries({
            queryKey: [...ASSET_QUERY_KEYS.all, 'scans'],
          });
        }
      )
      .subscribe();

    const hazardSub = supabase
      .channel('assets-page-hazards')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hazard_alerts' },
        () => {
          queryClient.invalidateQueries({
            queryKey: [...ASSET_QUERY_KEYS.all, 'hazards'],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(assetSub);
      supabase.removeChannel(scanSub);
      supabase.removeChannel(hazardSub);
    };
  }, [queryClient, enabled]);
}
