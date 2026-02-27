import { useInfiniteQuery } from '@tanstack/react-query';
import { listAuditLogs } from '@rgr/shared';
import type { ListAuditLogsParams } from '@rgr/shared';

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filters?: Omit<ListAuditLogsParams, 'cursor'>) =>
    [...auditLogKeys.lists(), filters] as const,
};

export function useAuditLogs(filters?: Omit<ListAuditLogsParams, 'cursor'>) {
  return useInfiniteQuery({
    queryKey: auditLogKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const params: ListAuditLogsParams = { ...filters };
      if (pageParam) params.cursor = pageParam as string;
      const result = await listAuditLogs(params);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.data.length === 0) return undefined;
      return lastPage.data[lastPage.data.length - 1]?.createdAt;
    },
  });
}
