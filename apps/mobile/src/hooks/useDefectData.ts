import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  listDefectReports,
  getDefectReportById,
  createDefectReport,
  updateDefectReportStatus,
  updateDefectReport,
  deleteDefectReport,
  getDefectReportStats,
  getAssetDefectReports,
  queryFromService,
} from '@rgr/shared';
import type { DefectStatus, UpdateDefectReportInput } from '@rgr/shared';
import { useMutationFromService } from './useMutationFromService';
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
        staleCutoffDays?: number;
      } = { limit: 20, staleCutoffDays: 7 };

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
    queryFn: queryFromService(() => getDefectReportById(id!)),
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
  return useMutationFromService({
    serviceFn: createDefectReport,
    invalidates: (data) => [
      defectKeys.lists(),
      defectKeys.stats(),
      defectKeys.asset(data.assetId),
      assetKeys.scanContext(data.assetId),
    ],
  });
}

/**
 * Update defect report status mutation
 */
export function useUpdateDefectReportStatus() {
  return useMutationFromService({
    serviceFn: ({
      id,
      status,
      extras,
    }: {
      id: string;
      status: DefectStatus;
      extras?: { maintenanceRecordId?: string; dismissedReason?: string };
    }) => updateDefectReportStatus(id, status, extras),
    invalidates: (data) => [defectKeys.detail(data.id), defectKeys.lists(), defectKeys.stats()],
  });
}

/**
 * Delete defect report mutation (hard-delete from DB)
 */
export function useDeleteDefectReport() {
  return useMutationFromService({
    serviceFn: deleteDefectReport,
    invalidates: [defectKeys.lists(), defectKeys.stats()],
  });
}

/**
 * Update defect report mutation (general field updates)
 */
export function useUpdateDefectReport() {
  return useMutationFromService({
    serviceFn: ({ id, input }: { id: string; input: UpdateDefectReportInput }) =>
      updateDefectReport(id, input),
    invalidates: (data) => [defectKeys.detail(data.id), defectKeys.lists()],
  });
}

/**
 * Fetch defect report statistics
 */
export function useDefectReportStats() {
  return useQuery({
    queryKey: defectKeys.stats(),
    queryFn: queryFromService(() => getDefectReportStats()),
    staleTime: 30_000,
  });
}
