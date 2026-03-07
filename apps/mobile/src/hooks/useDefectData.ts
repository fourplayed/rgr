import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDefectReports,
  getDefectReportById,
  createDefectReport,
  updateDefectReportStatus,
  updateDefectReport,
  deleteDefectReport,
  getDefectReportStats,
  getAssetDefectReports,
} from '@rgr/shared';
import type {
  DefectStatus,
  CreateDefectReportInput,
  UpdateDefectReportInput,
} from '@rgr/shared';
import { assetKeys } from './useAssetData';

/**
 * Defect report filter state
 */
export interface DefectFilters {
  status?: DefectStatus[];
  assetId?: string;
}

/**
 * Query keys for defect-related data
 */
export const defectKeys = {
  all: ['defects'] as const,
  lists: () => [...defectKeys.all, 'list'] as const,
  list: (filters: DefectFilters) => [...defectKeys.lists(), filters] as const,
  recent: (limit: number) => [...defectKeys.lists(), 'recent', limit] as const,
  asset: (assetId: string) => [...defectKeys.lists(), 'asset', assetId] as const,
  details: () => [...defectKeys.all, 'detail'] as const,
  detail: (id: string) => [...defectKeys.details(), id] as const,
  stats: () => [...defectKeys.all, 'stats'] as const,
};

/**
 * Fetch defect report list with filters — uses cursor-based infinite query
 * so records beyond the first page are accessible via loadMore.
 */
interface DefectCursor {
  createdAt: string;
  id: string;
}

export function useDefectReportList(filters: DefectFilters = {}) {
  return useInfiniteQuery({
    queryKey: defectKeys.list(filters),
    staleTime: 30_000,
    queryFn: async ({ pageParam }) => {
      const params: {
        status?: DefectStatus[];
        assetId?: string;
        limit: number;
        cursor?: DefectCursor;
      } = { limit: 20 };

      if (filters.status) params.status = filters.status;
      if (filters.assetId) params.assetId = filters.assetId;
      if (pageParam) params.cursor = pageParam;

      const result = await listDefectReports(params);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: undefined as DefectCursor | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.data.length === 0) return undefined;
      const lastItem = lastPage.data[lastPage.data.length - 1];
      if (!lastItem) return undefined;
      return { createdAt: lastItem.createdAt, id: lastItem.id };
    },
    maxPages: 10,
  });
}

/**
 * Fetch recent defect reports for dashboard activity feed
 */
export function useRecentDefectReports(limit: number = 5) {
  return useQuery({
    queryKey: defectKeys.recent(limit),
    staleTime: 30_000,
    queryFn: async () => {
      const result = await listDefectReports({ limit });
      if (!result.success) throw new Error(result.error ?? 'Failed to load');
      return result.data.data;
    },
  });
}

/**
 * Fetch single defect report by ID
 */
export function useDefectReport(id: string | null) {
  return useQuery({
    queryKey: defectKeys.detail(id ?? ''),
    staleTime: 30_000,
    queryFn: async () => {
      if (!id) throw new Error('Defect report ID is required');

      const result = await getDefectReportById(id);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch defect reports for a specific asset
 */
export function useAssetDefectReports(assetId: string | null) {
  return useQuery({
    queryKey: defectKeys.asset(assetId ?? ''),
    staleTime: 30_000,
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID is required');

      const result = await getAssetDefectReports(assetId);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data.data;
    },
    enabled: !!assetId,
  });
}

/**
 * Create defect report mutation
 */
export function useCreateDefectReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDefectReportInput) => {
      const result = await createDefectReport(input);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: defectKeys.lists(), refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: defectKeys.stats(), refetchType: 'none' });
      queryClient.invalidateQueries({
        queryKey: assetKeys.scanContext(variables.assetId),
      });
      // Cross-cache: defect creation triggers asset status change to 'maintenance'
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId), refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists(), refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: assetKeys.countsByStatus(), refetchType: 'none' });
    },
  });
}

/**
 * Update defect report status mutation
 */
export function useUpdateDefectReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      extras,
    }: {
      id: string;
      status: DefectStatus;
      extras?: { maintenanceRecordId?: string; dismissedReason?: string };
    }) => {
      const result = await updateDefectReportStatus(id, status, extras);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: defectKeys.lists(), refetchType: 'none' });
      // Detail: immediate refetch — user is viewing this record
      queryClient.invalidateQueries({ queryKey: defectKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: defectKeys.stats(), refetchType: 'none' });
      // Cross-cache: resolving/dismissing defects may revert asset status to 'serviced'
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(data.assetId), refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists(), refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: assetKeys.countsByStatus(), refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: assetKeys.scanContext(data.assetId), refetchType: 'none' });
    },
  });
}

/**
 * Delete defect report mutation (hard-delete from DB)
 */
export function useDeleteDefectReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteDefectReport(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: defectKeys.lists(), refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: defectKeys.stats(), refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: assetKeys.all, refetchType: 'none' });
    },
  });
}

/**
 * Update defect report mutation (general field updates)
 */
export function useUpdateDefectReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateDefectReportInput }) => {
      const result = await updateDefectReport(id, input);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: defectKeys.lists(), refetchType: 'none' });
      // Detail: immediate refetch — user is viewing this record
      queryClient.invalidateQueries({ queryKey: defectKeys.detail(data.id) });
    },
  });
}

/**
 * Fetch defect report statistics
 */
export function useDefectReportStats() {
  return useQuery({
    queryKey: defectKeys.stats(),
    queryFn: async () => {
      const result = await getDefectReportStats();

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    staleTime: 30_000,
  });
}
