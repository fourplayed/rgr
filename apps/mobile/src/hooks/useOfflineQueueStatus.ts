import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getQueueSummary, MutationType } from '../utils/offlineMutationQueue';

export type QueueSummary = Record<MutationType, number>;

/** Polls the offline mutation queue grouped by type every 10s and on NetInfo changes. */
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
    const interval = setInterval(refresh, 10_000);
    const unsubscribe = NetInfo.addEventListener(() => {
      refresh();
    });
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [refresh]);

  const total = summary.scan + summary.defect_report + summary.maintenance + summary.photo;
  return { total, summary };
}
