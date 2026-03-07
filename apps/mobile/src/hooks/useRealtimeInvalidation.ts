import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@rgr/shared';
import { useAuthStore } from '../store/authStore';
import { assetKeys } from './useAssetData';

/**
 * Subscribe to Supabase Realtime changes and invalidate React Query caches.
 *
 * Mirrors the web's useFleetRealtime pattern for the mobile app.
 * Subscribes to scan_events and assets changes so the dashboard
 * reflects updates from other users without manual refresh.
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
        queryClient.invalidateQueries({
          queryKey: assetKeys.recentScans(),
          refetchType: 'none',
        });
        queryClient.invalidateQueries({
          queryKey: assetKeys.totalScanCount(),
          refetchType: 'none',
        });
      })
      .subscribe();

    const assetChannel = supabase
      .channel('mobile-asset-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, () => {
        queryClient.invalidateQueries({
          queryKey: assetKeys.lists(),
          refetchType: 'none',
        });
      })
      .subscribe();

    return () => {
      scanChannel.unsubscribe();
      assetChannel.unsubscribe();
      supabase.removeChannel(scanChannel);
      supabase.removeChannel(assetChannel);
    };
  }, [queryClient, isAuthenticated]);
}
