import { acceptDefectReport } from '@rgr/shared';
import type { CreateMaintenanceInput } from '@rgr/shared';
import { useMutationFromService } from './useMutationFromService';
import { defectKeys } from './useDefectData';
import { maintenanceKeys } from './useMaintenanceData';

/**
 * Accept a defect report by creating a linked maintenance task atomically.
 * Uses a single server-side RPC that wraps both operations in a transaction,
 * preventing orphaned maintenance records if the defect status update fails.
 */
export function useAcceptDefect() {
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
  });
}
