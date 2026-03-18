import { useState, useCallback } from 'react';
import { useQueryClient, onlineManager } from '@tanstack/react-query';
import { updateMaintenanceStatus } from '@rgr/shared';
import { maintenanceKeys } from './useMaintenanceData';
import { suppressRealtimeFor } from './useRealtimeInvalidation';

interface BulkProgress {
  completed: number;
  failed: number;
  total: number;
}

export function useBulkCompleteMaintenance() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BulkProgress>({ completed: 0, failed: 0, total: 0 });

  const bulkComplete = useCallback(
    async (ids: string[]): Promise<BulkProgress> => {
      if (!onlineManager.isOnline()) {
        throw new Error('Bulk completion requires an internet connection');
      }

      setIsProcessing(true);
      setProgress({ completed: 0, failed: 0, total: ids.length });

      // Single cache operation: cancel + suppress
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.lists() });
      suppressRealtimeFor('maintenance');

      // Snapshot list cache and optimistically update all items
      const listKey = maintenanceKeys.lists();
      const listSnapshot = queryClient.getQueriesData({ queryKey: listKey });

      const completedSet = new Set(ids);
      queryClient.setQueriesData({ queryKey: listKey }, (old: unknown) => {
        if (!old || typeof old !== 'object' || !('pages' in old)) return old;
        const data = old as {
          pages: Array<{ data: Array<{ id: string; status: string }> }>;
          pageParams: unknown[];
        };
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            data: page.data.map((item) =>
              completedSet.has(item.id) ? { ...item, status: 'completed' } : item
            ),
          })),
        };
      });

      // Sequential RPC calls
      let completed = 0;
      let failed = 0;
      const failedIds: string[] = [];

      for (const id of ids) {
        try {
          const result = await updateMaintenanceStatus(id, 'completed');
          if (result.success) {
            completed++;
          } else {
            failed++;
            failedIds.push(id);
          }
        } catch {
          failed++;
          failedIds.push(id);
        }
        setProgress({ completed, failed, total: ids.length });
      }

      // Rollback failed items by restoring snapshot
      if (failedIds.length > 0 && listSnapshot) {
        for (const [key, data] of listSnapshot) {
          queryClient.setQueryData(key, data);
        }
      }

      // Single batch invalidation
      await queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() });

      setIsProcessing(false);
      return { completed, failed, total: ids.length };
    },
    [queryClient]
  );

  return { bulkComplete, isProcessing, progress };
}
