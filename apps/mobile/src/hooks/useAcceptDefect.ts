import { useQueryClient } from '@tanstack/react-query';
import { acceptDefectReport } from '@rgr/shared';
import type { CreateMaintenanceInput, MaintenanceListItem } from '@rgr/shared';
import { useMutationFromService } from './useMutationFromService';
import { defectKeys } from './useDefectData';
import { maintenanceKeys } from './useMaintenanceData';
import {
  optimisticPatch,
  optimisticInfiniteInsert,
  rollback,
  placeholderId,
} from './optimisticCache';
import { suppressRealtimeFor } from './useRealtimeInvalidation';
import { OPTIMISTIC_UPDATES_ENABLED } from '../config/featureFlags';
import { useAuthStore } from '../store/authStore';

/**
 * Accept a defect report by creating a linked maintenance task atomically.
 * Uses a single server-side RPC that wraps both operations in a transaction,
 * preventing orphaned maintenance records if the defect status update fails.
 *
 * Optimistic: immediately patches defect status to 'task_created' and inserts
 * a maintenance placeholder into the list cache. Both roll back on error.
 */
export function useAcceptDefect() {
  const queryClient = useQueryClient();
  const userName = useAuthStore((s) => s.user?.fullName ?? null);

  return useMutationFromService({
    serviceFn: ({
      defectReportId,
      maintenanceInput,
    }: {
      defectReportId: string;
      maintenanceInput: CreateMaintenanceInput;
    }) => acceptDefectReport(defectReportId, maintenanceInput),
    invalidates: (_data, vars) => [
      defectKeys.detail(vars.defectReportId),
      defectKeys.lists(),
      maintenanceKeys.lists(),
      maintenanceKeys.stats(),
    ],
    onMutate: async ({ defectReportId, maintenanceInput }) => {
      if (!OPTIMISTIC_UPDATES_ENABLED) return undefined;

      // Suppress both domains — the server RPC touches both tables
      suppressRealtimeFor('defects');
      suppressRealtimeFor('maintenance');

      // 1. Patch defect detail cache — status → 'task_created'
      const defectSnapshot = await optimisticPatch(queryClient, defectKeys.detail(defectReportId), {
        status: 'task_created',
      });

      // 2. Build maintenance placeholder matching MaintenanceListItem shape
      const placeholder: MaintenanceListItem = {
        id: placeholderId(),
        assetId: maintenanceInput.assetId,
        title: maintenanceInput.title,
        description: maintenanceInput.description ?? null,
        priority: maintenanceInput.priority ?? 'medium',
        status: maintenanceInput.status ?? 'scheduled',
        maintenanceType: maintenanceInput.maintenanceType ?? null,
        scheduledDate: maintenanceInput.scheduledDate ?? null,
        dueDate: maintenanceInput.dueDate ?? null,
        createdAt: new Date().toISOString(),
        reporterName: userName,
        assetNumber: null,
        assetCategory: null,
      };

      // 3. Insert into unfiltered maintenance list
      const maintenanceSnapshot = await optimisticInfiniteInsert(
        queryClient,
        maintenanceKeys.list({}),
        placeholder
      );

      // 4. Invalidate filtered lists so they refetch (skip the unfiltered list we just updated)
      const unfilteredKey = JSON.stringify(maintenanceKeys.list({}));
      queryClient.invalidateQueries({
        queryKey: maintenanceKeys.lists(),
        predicate: (query) => JSON.stringify(query.queryKey) !== unfilteredKey,
      });

      return { defectSnapshot, maintenanceSnapshot };
    },
    onError: (_error, _vars, context) => {
      if (context?.defectSnapshot) rollback(queryClient, context.defectSnapshot);
      if (context?.maintenanceSnapshot) rollback(queryClient, context.maintenanceSnapshot);
    },
  });
}
