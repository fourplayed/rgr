import { useInfiniteQuery } from '@tanstack/react-query';
import { listAuditLogs } from '@rgr/shared';
import type { ListAuditLogsParams } from '@rgr/shared';

interface AuditLogCursor {
  createdAt: string;
  id: string;
}

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filters?: Omit<ListAuditLogsParams, 'cursor' | 'cursorId'>) =>
    [...auditLogKeys.lists(), filters] as const,
};

export function useAuditLogs(filters?: Omit<ListAuditLogsParams, 'cursor' | 'cursorId'>) {
  return useInfiniteQuery({
    queryKey: auditLogKeys.list(filters),
    staleTime: 60_000,
    queryFn: async ({ pageParam }) => {
      const params: ListAuditLogsParams = { ...filters };
      if (pageParam) {
        params.cursor = pageParam.createdAt;
        params.cursorId = pageParam.id;
      }
      const result = await listAuditLogs(params);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: undefined as AuditLogCursor | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.data.length === 0) return undefined;
      const lastItem = lastPage.data[lastPage.data.length - 1];
      if (!lastItem) return undefined;
      return { createdAt: lastItem.createdAt, id: lastItem.id };
    },
  });
}
