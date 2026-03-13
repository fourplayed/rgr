import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@rgr/shared';
import { useAuthStore } from '../store/authStore';

/**
 * Module-scoped set of query key prefixes currently suppressed.
 * When a local optimistic mutation fires, it calls `suppressRealtimeFor()`
 * to prevent the incoming realtime event from racing with onSettled.
 */
const suppressedKeys = new Set<string>();
const suppressionTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
        if (status === 'SUBSCRIBED') {
          queryClient.invalidateQueries({ queryKey: ['scans'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['assets'], refetchType: 'active' });
        }
      });

    const assetChannel = supabase
      .channel('mobile-asset-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        invalidateIfNotSuppressed('assets', ['assets']);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          queryClient.invalidateQueries({ queryKey: ['assets'], refetchType: 'active' });
        }
      });

    const defectChannel = supabase
      .channel('mobile-defect-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'defect_reports' }, () => {
        invalidateIfNotSuppressed('defects', ['defects']);
        invalidateIfNotSuppressed('assets', ['assets']);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          queryClient.invalidateQueries({ queryKey: ['defects'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['assets'], refetchType: 'active' });
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
        if (status === 'SUBSCRIBED') {
          queryClient.invalidateQueries({ queryKey: ['maintenance'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['assets'], refetchType: 'active' });
        }
      });

    return () => {
      scanChannel.unsubscribe();
      assetChannel.unsubscribe();
      defectChannel.unsubscribe();
      maintenanceChannel.unsubscribe();
      supabase.removeChannel(scanChannel);
      supabase.removeChannel(assetChannel);
      supabase.removeChannel(defectChannel);
      supabase.removeChannel(maintenanceChannel);
    };
  }, [queryClient, isAuthenticated]);
}
