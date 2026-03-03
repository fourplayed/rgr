import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMaintenance, updateDefectReportStatus } from '@rgr/shared';
import type { CreateMaintenanceInput } from '@rgr/shared';
import { defectKeys } from './useDefectData';
import { maintenanceKeys } from './useMaintenanceData';

/**
 * Composite mutation: accept a defect by creating a maintenance task
 * and linking it back to the defect report.
 *
 * Steps:
 * 1. Create the maintenance record from the provided input
 * 2. Update the defect status to 'accepted' with the maintenance_record_id link
 * 3. Invalidate both defect and maintenance caches
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
      // Step 1: Create maintenance task
      const createResult = await createMaintenance(maintenanceInput);
      if (!createResult.success) {
        throw new Error(createResult.error ?? 'Failed to create maintenance task');
      }

      const maintenanceRecord = createResult.data;

      // Step 2: Update defect to accepted with link
      const statusResult = await updateDefectReportStatus(
        defectReportId,
        'accepted',
        { maintenanceRecordId: maintenanceRecord.id }
      );

      if (!statusResult.success) {
        throw new Error(statusResult.error ?? 'Failed to accept defect report');
      }

      return {
        defectReport: statusResult.data,
        maintenanceRecord,
      };
    },
    onSuccess: () => {
      // Invalidate both caches
      queryClient.invalidateQueries({ queryKey: defectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: defectKeys.stats() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() });
    },
  });
}
