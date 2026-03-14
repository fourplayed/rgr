import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getQueueLength } from '../utils/offlineMutationQueue';

/** Polls the offline mutation queue length every 10s and on NetInfo changes. */
export function useOfflineQueueStatus(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setCount(await getQueueLength());
    } catch {
      // AsyncStorage read failed — leave count as-is
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

  return count;
}
