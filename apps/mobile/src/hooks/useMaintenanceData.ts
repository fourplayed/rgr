import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenanceStatus,
  updateMaintenance,
  cancelMaintenanceTask,
  getMaintenanceStats,
  queryFromService,
  queryFromPaginatedService,
} from '@rgr/shared';
import type {
  MaintenanceStatus,
  MaintenancePriority,
  UpdateMaintenanceInput,
  CreateMaintenanceInput,
  MaintenanceListItem as MaintenanceListItemType,
} from '@rgr/shared';
import { useMutationFromService } from './useMutationFromService';
import { assetKeys } from './useAssetData';
import { defectKeys } from './useDefectData';
import {
  optimisticInfiniteInsert,
  optimisticPatch,
  rollback,
  placeholderId,
} from './optimisticCache';
import { suppressRealtimeFor } from './useRealtimeInvalidation';
import { OPTIMISTIC_UPDATES_ENABLED } from '../config/featureFlags';
import { useAuthStore } from '../store/authStore';

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
    queryFn: queryFromPaginatedService(() => listMaintenance({ limit })),
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
 * Build a placeholder list item for optimistic insertion.
 * The real ID arrives when onSettled invalidates the cache.
 */
function buildMaintenancePlaceholder(
  input: CreateMaintenanceInput,
  currentUserName: string | null
): MaintenanceListItemType {
  return {
    id: placeholderId(),
    assetId: input.assetId,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority ?? 'medium',
    status: input.status ?? 'scheduled',
    maintenanceType: input.maintenanceType ?? null,
    scheduledDate: input.scheduledDate ?? null,
    dueDate: input.dueDate ?? null,
    createdAt: new Date().toISOString(),
    reporterName: currentUserName,
    assetNumber: null,
    assetCategory: null,
  };
}

/**
 * Create maintenance record mutation — with optimistic list insertion.
 */
export function useCreateMaintenance() {
  const queryClient = useQueryClient();
  const userName = useAuthStore((s) => s.user?.fullName ?? null);

  return useMutationFromService({
    serviceFn: createMaintenance,
    invalidates: (data) => [
      maintenanceKeys.lists(),
      maintenanceKeys.stats(),
      assetKeys.maintenance(data.assetId),
      assetKeys.scanContext(data.assetId),
    ],
    onMutate: async (input: CreateMaintenanceInput) => {
      if (!OPTIMISTIC_UPDATES_ENABLED) return undefined;
      suppressRealtimeFor('maintenance');
      const placeholder = buildMaintenancePlaceholder(input, userName);
      const listSnapshot = await optimisticInfiniteInsert(
        queryClient,
        maintenanceKeys.list({}),
        placeholder
      );
      // Invalidate any filtered list caches so they refetch
      // (skip the unfiltered list we just optimistically updated)
      const unfilteredKey = JSON.stringify(maintenanceKeys.list({}));
      queryClient.invalidateQueries({
        queryKey: maintenanceKeys.lists(),
        predicate: (query) => JSON.stringify(query.queryKey) !== unfilteredKey,
      });
      return { listSnapshot };
    },
    onError: (_error, _vars, context) => {
      if (context?.listSnapshot) rollback(queryClient, context.listSnapshot);
    },
  });
}

/**
 * Update maintenance status mutation — with optimistic detail patch.
 */
export function useUpdateMaintenanceStatus() {
  const queryClient = useQueryClient();

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
    onMutate: async (vars: { id: string; status: MaintenanceStatus }) => {
      if (!OPTIMISTIC_UPDATES_ENABLED) return undefined;
      suppressRealtimeFor('maintenance');
      const detailSnapshot = await optimisticPatch(queryClient, maintenanceKeys.detail(vars.id), {
        status: vars.status,
      });
      return { detailSnapshot };
    },
    onError: (_error, _vars, context) => {
      if (context?.detailSnapshot) rollback(queryClient, context.detailSnapshot);
    },
  });
}

/**
 * Cancel (delete) maintenance task mutation — also deletes linked defects
 */
export function useCancelMaintenanceTask() {
  return useMutationFromService({
    serviceFn: cancelMaintenanceTask,
    invalidates: [maintenanceKeys.lists(), maintenanceKeys.stats(), defectKeys.lists()],
  });
}

/**
 * Update maintenance record mutation
 */
export function useUpdateMaintenance() {
  return useMutationFromService({
    serviceFn: ({ id, input }: { id: string; input: UpdateMaintenanceInput }) =>
      updateMaintenance(id, input),
    invalidates: (data) => [maintenanceKeys.detail(data.id), maintenanceKeys.lists()],
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
