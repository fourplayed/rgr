import { useMutation, useQueryClient } from '@tanstack/react-query';
import { acceptDefectReport } from '@rgr/shared';
import type { CreateMaintenanceInput } from '@rgr/shared';
import { defectKeys } from './useDefectData';
import { maintenanceKeys } from './useMaintenanceData';
import { assetKeys } from './useAssetData';

/**
 * Accept a defect report by creating a linked maintenance task atomically.
 * Uses a single server-side RPC that wraps both operations in a transaction,
 * preventing orphaned maintenance records if the defect status update fails.
 */
export function useAcceptDefect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      defectReportId,
      maintenanceInput,
    }: {
      defectReportId: string;
      maintenanceInput: CreateMaintenanceInput;
    }) => {
      const result = await acceptDefectReport(defectReportId, maintenanceInput);

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to accept defect report');
      }

      return result.data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate both caches
      queryClient.invalidateQueries({ queryKey: defectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: defectKeys.stats() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() });
      // Cross-cache: refresh asset detail's maintenance data so assessment updates
      queryClient.invalidateQueries({ queryKey: assetKeys.maintenance(variables.maintenanceInput.assetId) });
    },
  });
}
