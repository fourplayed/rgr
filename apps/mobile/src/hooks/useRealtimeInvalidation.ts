import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@rgr/shared';
import { useAuthStore } from '../store/authStore';

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
export function useRealtimeInvalidation() {
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

    const scanChannel = supabase
      .channel('mobile-scan-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scan_events' }, () => {
        queryClient.invalidateQueries({ queryKey: ['scans'], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['assets'], refetchType: 'active' });
      })
      .subscribe();

    const assetChannel = supabase
      .channel('mobile-asset-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        queryClient.invalidateQueries({ queryKey: ['assets'], refetchType: 'active' });
      })
      .subscribe();

    const defectChannel = supabase
      .channel('mobile-defect-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'defect_reports' }, () => {
        queryClient.invalidateQueries({ queryKey: ['defects'], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['assets'], refetchType: 'active' });
      })
      .subscribe();

    const maintenanceChannel = supabase
      .channel('mobile-maintenance-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, () => {
        queryClient.invalidateQueries({ queryKey: ['maintenance'], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['assets'], refetchType: 'active' });
      })
      .subscribe();

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
