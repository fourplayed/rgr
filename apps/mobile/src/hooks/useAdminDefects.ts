import { useQuery } from '@tanstack/react-query';
import {
  adminListDefectReports,
  bulkDeleteDefectReports,
  queryFromService,
} from '@rgr/shared';
import type { AdminListDefectReportsParams } from '@rgr/shared';
import { useMutationFromService } from './useMutationFromService';
import { defectKeys } from './useDefectData';

export const adminDefectKeys = {
  all: ['admin-defects'] as const,
  lists: () => [...adminDefectKeys.all, 'list'] as const,
  list: (params: AdminListDefectReportsParams) =>
    [...adminDefectKeys.lists(), params] as const,
};

export function useAdminDefectList(params: AdminListDefectReportsParams = {}) {
  return useQuery({
    queryKey: adminDefectKeys.list(params),
    queryFn: queryFromService(() => adminListDefectReports(params)),
    staleTime: 30_000,
  });
}

export function useBulkDeleteDefects() {
  return useMutationFromService({
    serviceFn: bulkDeleteDefectReports,
    invalidates: [
      adminDefectKeys.all,
      defectKeys.lists(),
      defectKeys.stats(),
    ],
  });
}
