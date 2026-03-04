import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenanceStatus,
  updateMaintenance,
  getMaintenanceStats,
} from '@rgr/shared';
import type {
  MaintenanceStatus,
  MaintenancePriority,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
} from '@rgr/shared';
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
        beforeId?: string;
      } = { limit: 20 };

      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assetId) params.assetId = filters.assetId;
      if (pageParam) params.beforeId = pageParam;

      const result = await listMaintenance(params);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.data.length === 0) return undefined;
      const lastItem = lastPage.data[lastPage.data.length - 1];
      return lastItem?.id;
    },
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
    queryFn: async () => {
      if (!id) throw new Error('Maintenance ID is required');

      const result = await getMaintenanceById(id);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    enabled: !!id,
  });
}

/**
 * Create maintenance record mutation
 */
export function useCreateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMaintenanceInput) => {
      const result = await createMaintenance(input);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: () => {
      // Invalidate all list queries to refresh filtered views
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() });
    },
  });
}

/**
 * Update maintenance status mutation
 */
export function useUpdateMaintenanceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: MaintenanceStatus;
    }) => {
      const result = await updateMaintenanceStatus(id, status);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate lists and the specific detail
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() });
      // Cross-cache: auto-resolved defects need to refresh
      queryClient.invalidateQueries({ queryKey: defectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: defectKeys.stats() });
    },
  });
}

/**
 * Update maintenance record mutation
 */
export function useUpdateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateMaintenanceInput }) => {
      const result = await updateMaintenance(id, input);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate lists and the specific detail
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(data.id) });
    },
  });
}

/**
 * Fetch maintenance statistics for dashboard
 */
export function useMaintenanceStats() {
  return useQuery({
    queryKey: maintenanceKeys.stats(),
    queryFn: async () => {
      const result = await getMaintenanceStats();

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}
