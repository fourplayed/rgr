import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@rgr/shared';
import { useAuthStore } from '../store/authStore';

/**
 * Module-scoped set of query key prefixes currently suppressed.
 * When a local optimistic mutation fires, it calls `suppressRealtimeFor()`
 * to prevent the incoming realtime event from racing with onSettled.
 *
 * Cleaned up on hot-reload (via module.hot) so stale suppressions
 * don't carry across edits during development.
 */
const suppressedKeys = new Set<string>();
const suppressionTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Clean up module-scoped state on hot-reload to prevent stale suppressions
if (
  __DEV__ &&
  typeof module !== 'undefined' &&
  (module as NodeModule & { hot?: { dispose: (cb: () => void) => void } }).hot
) {
  (module as NodeModule & { hot?: { dispose: (cb: () => void) => void } }).hot!.dispose(() => {
    clearRealtimeSuppressions();
    clearRealtimeDebounce();
  });
}

/**
 * Temporarily suppress realtime invalidation for a query key prefix.
 * Use in optimistic mutation `onMutate` to prevent the realtime handler
 * from overwriting optimistic state before onSettled fires.
 *
 * If called again for the same key before the previous timer expires,
 * the old timer is cleared and a new one starts (prevents premature removal).
 *
 * @param keyPrefix - The first segment of the query key (e.g. 'maintenance', 'defects')
 * @param durationMs - How long to suppress (default 3000ms)
 */
export function suppressRealtimeFor(keyPrefix: string, durationMs = 3000): void {
  const existingTimer = suppressionTimers.get(keyPrefix);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  suppressedKeys.add(keyPrefix);
  const timer = setTimeout(() => {
    suppressedKeys.delete(keyPrefix);
    suppressionTimers.delete(keyPrefix);
  }, durationMs);
  suppressionTimers.set(keyPrefix, timer);
}

/**
 * Clear all active realtime suppressions and their timers.
 * Call on logout to prevent stale suppression state from carrying
 * over into a subsequent session.
 */
export function clearRealtimeSuppressions(): void {
  for (const timer of suppressionTimers.values()) {
    clearTimeout(timer);
  }
  suppressionTimers.clear();
  suppressedKeys.clear();
}

const RECONNECT_DEBOUNCE_MS = 5000;
const _lastInvalidatedAt = new Map<string, number>();

/** Reset reconnect debounce timestamps — call on logout */
export function clearRealtimeDebounce(): void {
  _lastInvalidatedAt.clear();
}

function shouldDebounceReconnect(channelName: string): boolean {
  const last = _lastInvalidatedAt.get(channelName);
  const now = Date.now();
  if (last && now - last < RECONNECT_DEBOUNCE_MS) return true;
  _lastInvalidatedAt.set(channelName, now);
  return false;
}

/**
 * Subscribe to Supabase Realtime changes and invalidate React Query caches.
 *
 * Mirrors the web's useFleetRealtime pattern for the mobile app.
 * Subscribes to scan_events, assets, defect_reports, and maintenance_records
 * so screens reflect updates from other users without manual refresh.
 *
 * Uses `refetchType: 'active'` — only queries with mounted observers refetch
 * immediately; unmounted queries are marked stale for next access (zero network
 * cost for tabs the user isn't viewing).
 *
 * Only active when the user is authenticated.
 */
export function useRealtimeInvalidation(): void {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch {
      // Client not initialized yet
      return;
    }

    function invalidateIfNotSuppressed(keyPrefix: string, queryKey: readonly unknown[]) {
      if (suppressedKeys.has(keyPrefix)) return;
      queryClient.invalidateQueries({ queryKey: queryKey as unknown[], refetchType: 'active' });
    }

    const scanChannel = supabase
      .channel('mobile-scan-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scan_events' }, () => {
        invalidateIfNotSuppressed('scans', ['scans']);
        invalidateIfNotSuppressed('assets', ['assets']);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !shouldDebounceReconnect('scan')) {
          invalidateIfNotSuppressed('scans', ['scans']);
          invalidateIfNotSuppressed('assets', ['assets']);
        }
      });

    // Assets channel: subscribe to INSERT and UPDATE only.
    // INSERT covers new assets; UPDATE covers scan-driven status changes,
    // registration updates, and admin edits. DELETE is omitted because it is
    // admin-only, rare, and the web app handles it — mobile users will see
    // stale entries until their next query refetch, which is acceptable.
    const assetChannel = supabase
      .channel('mobile-asset-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assets' }, () => {
        invalidateIfNotSuppressed('assets', ['assets']);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, () => {
        invalidateIfNotSuppressed('assets', ['assets']);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !shouldDebounceReconnect('asset')) {
          invalidateIfNotSuppressed('assets', ['assets']);
        }
      });

    const defectChannel = supabase
      .channel('mobile-defect-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'defect_reports' }, () => {
        invalidateIfNotSuppressed('defects', ['defects']);
        invalidateIfNotSuppressed('assets', ['assets']);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !shouldDebounceReconnect('defect')) {
          invalidateIfNotSuppressed('defects', ['defects']);
          invalidateIfNotSuppressed('assets', ['assets']);
        }
      });

    const maintenanceChannel = supabase
      .channel('mobile-maintenance-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_records' },
        () => {
          invalidateIfNotSuppressed('maintenance', ['maintenance']);
          invalidateIfNotSuppressed('assets', ['assets']);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !shouldDebounceReconnect('maintenance')) {
          invalidateIfNotSuppressed('maintenance', ['maintenance']);
          invalidateIfNotSuppressed('assets', ['assets']);
        }
      });

    const fleetAnalysisChannel = supabase
      .channel('mobile-fleet-analysis-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fleet_analysis' },
        () => {
          invalidateIfNotSuppressed('fleetAnalysis', ['fleetAnalysis']);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !shouldDebounceReconnect('fleetAnalysis')) {
          invalidateIfNotSuppressed('fleetAnalysis', ['fleetAnalysis']);
        }
      });

    return () => {
      supabase.removeChannel(scanChannel);
      supabase.removeChannel(assetChannel);
      supabase.removeChannel(defectChannel);
      supabase.removeChannel(maintenanceChannel);
      supabase.removeChannel(fleetAnalysisChannel);
    };
  }, [queryClient, isAuthenticated]);
}
