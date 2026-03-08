import { useMutation } from '@tanstack/react-query';
import { acceptDefectReport } from '@rgr/shared';
import type { CreateMaintenanceInput } from '@rgr/shared';

/**
 * Accept a defect report by creating a linked maintenance task atomically.
 * Uses a single server-side RPC that wraps both operations in a transaction,
 * preventing orphaned maintenance records if the defect status update fails.
 */
export function useAcceptDefect() {
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
    // Global MutationCache.onSuccess handles cross-domain invalidation
  });
}
