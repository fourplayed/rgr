import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  listMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenanceStatus,
  updateMaintenance,
  cancelMaintenanceTask,
  getMaintenanceStats,
  queryFromService,
} from '@rgr/shared';
import type {
  MaintenanceStatus,
  MaintenancePriority,
  UpdateMaintenanceInput,
} from '@rgr/shared';
import { useMutationFromService } from './useMutationFromService';
import { assetKeys } from './useAssetData';
import { defectKeys } from './useDefectData';

/**
 * Maintenance filter state
 */
export interface MaintenanceFilters {
  status?: MaintenanceStatus[];
  priority?: MaintenancePriority[];
  assetId?: string;
}

/**
 * Query keys for maintenance-related data
 */
export const maintenanceKeys = {
  all: ['maintenance'] as const,
  lists: () => [...maintenanceKeys.all, 'list'] as const,
  list: (filters: MaintenanceFilters) => [...maintenanceKeys.lists(), filters] as const,
  recent: (limit: number) => [...maintenanceKeys.lists(), 'recent', limit] as const,
  details: () => [...maintenanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...maintenanceKeys.details(), id] as const,
  stats: () => [...maintenanceKeys.all, 'stats'] as const,
};

/**
 * Fetch maintenance list with filters — uses cursor-based infinite query
 * so records beyond the first page are accessible via loadMore.
 */
interface MaintenanceCursor {
  createdAt: string;
  id: string;
}

export function useMaintenanceList(filters: MaintenanceFilters = {}) {
  return useInfiniteQuery({
    queryKey: maintenanceKeys.list(filters),
    staleTime: 30_000,
    queryFn: async ({ pageParam }) => {
      const params: {
        status?: MaintenanceStatus[];
        priority?: MaintenancePriority[];
        assetId?: string;
        limit: number;
        cursor?: MaintenanceCursor;
        staleCutoffDays?: number;
      } = { limit: 20, staleCutoffDays: 7 };

      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assetId) params.assetId = filters.assetId;
      if (pageParam) params.cursor = pageParam;

      const result = await listMaintenance(params);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: undefined as MaintenanceCursor | undefined,
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
 * Fetch recent maintenance records for dashboard activity feed
 */
export function useRecentMaintenance(limit: number = 5) {
  return useQuery({
    queryKey: maintenanceKeys.recent(limit),
    staleTime: 30_000,
    queryFn: async () => {
      const result = await listMaintenance({ limit });
      if (!result.success) throw new Error(result.error ?? 'Failed to load');
      return result.data.data;
    },
  });
}

/**
 * Fetch single maintenance record by ID
 */
export function useMaintenance(id: string | null) {
  return useQuery({
    queryKey: maintenanceKeys.detail(id ?? ''),
    staleTime: 30_000,
    queryFn: queryFromService(() => getMaintenanceById(id!)),
    enabled: !!id,
  });
}

/**
 * Create maintenance record mutation
 */
export function useCreateMaintenance() {
  return useMutationFromService({
    serviceFn: createMaintenance,
    invalidates: (data) => [
      maintenanceKeys.lists(),
      maintenanceKeys.stats(),
      assetKeys.maintenance(data.assetId),
      assetKeys.scanContext(data.assetId),
    ],
  });
}

/**
 * Update maintenance status mutation
 */
export function useUpdateMaintenanceStatus() {
  return useMutationFromService({
    serviceFn: ({
      id,
      status,
      extras,
    }: {
      id: string;
      status: MaintenanceStatus;
      extras?: { completedBy?: string };
    }) => updateMaintenanceStatus(id, status, extras),
    invalidates: (data) => [
      maintenanceKeys.detail(data.id),
      maintenanceKeys.lists(),
      maintenanceKeys.stats(),
    ],
  });
}

/**
 * Cancel (delete) maintenance task mutation — also deletes linked defects
 */
export function useCancelMaintenanceTask() {
  return useMutationFromService({
    serviceFn: cancelMaintenanceTask,
    invalidates: [
      maintenanceKeys.lists(),
      maintenanceKeys.stats(),
      defectKeys.lists(),
    ],
  });
}

/**
 * Update maintenance record mutation
 */
export function useUpdateMaintenance() {
  return useMutationFromService({
    serviceFn: ({ id, input }: { id: string; input: UpdateMaintenanceInput }) =>
      updateMaintenance(id, input),
    invalidates: (data) => [
      maintenanceKeys.detail(data.id),
      maintenanceKeys.lists(),
    ],
  });
}

/**
 * Fetch maintenance statistics for dashboard
 */
export function useMaintenanceStats() {
  return useQuery({
    queryKey: maintenanceKeys.stats(),
    queryFn: queryFromService(() => getMaintenanceStats()),
    staleTime: 30_000,
  });
}
