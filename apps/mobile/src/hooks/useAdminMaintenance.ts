import { useQuery } from '@tanstack/react-query';
import { queryFromService } from '@rgr/shared';
import { adminListMaintenance, bulkCancelMaintenanceTasks } from '@rgr/shared/admin';
import type { AdminListMaintenanceParams } from '@rgr/shared/admin';
import { useMutationFromService } from './useMutationFromService';
import { maintenanceKeys } from './useMaintenanceData';
import { defectKeys } from './useDefectData';

export const adminMaintenanceKeys = {
  all: ['admin-maintenance'] as const,
  lists: () => [...adminMaintenanceKeys.all, 'list'] as const,
  list: (params: AdminListMaintenanceParams) => [...adminMaintenanceKeys.lists(), params] as const,
};

export function useAdminMaintenanceList(params: AdminListMaintenanceParams = {}) {
  return useQuery({
    queryKey: adminMaintenanceKeys.list(params),
    queryFn: queryFromService(() => adminListMaintenance(params)),
    staleTime: 30_000,
  });
}

export function useBulkCancelMaintenance() {
  return useMutationFromService({
    serviceFn: bulkCancelMaintenanceTasks,
    invalidates: [
      adminMaintenanceKeys.all,
      maintenanceKeys.lists(),
      maintenanceKeys.stats(),
      defectKeys.lists(),
    ],
  });
}
