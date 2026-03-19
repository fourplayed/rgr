import { useState, useEffect, useCallback } from 'react';
import { getQueueSummary, MutationType } from '../utils/offlineMutationQueue';
import { eventBus } from '../utils/eventBus';

export type QueueSummary = Record<MutationType, number>;

/**
 * Subscribes to queue:changed events for immediate updates.
 * Falls back to polling every 60s as a safety net (e.g., queue modified by another module
 * that doesn't emit). On mount, reads the queue once to pick up any pre-existing entries.
 */
export function useOfflineQueueStatus(): { total: number; summary: QueueSummary } {
  const [summary, setSummary] = useState<QueueSummary>({
    scan: 0,
    defect_report: 0,
    maintenance: 0,
    photo: 0,
  });

  const refresh = useCallback(async () => {
    try {
      setSummary(await getQueueSummary());
    } catch {
      // AsyncStorage read failed — leave summary as-is
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    const unsubscribe = eventBus.on('queue:changed', refresh);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [refresh]);

  const total = summary.scan + summary.defect_report + summary.maintenance + summary.photo;
  return { total, summary };
}
