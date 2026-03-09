import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { useDepots } from './useDepots';
import { useLocationStore } from '../store/locationStore';

/**
 * Keeps location resolution fresh by listening to AppState changes.
 * When the app returns to the foreground, checks if the cached location
 * is stale (>5 min) and triggers a background re-resolve if needed.
 *
 * Mount once inside the authenticated tab layout.
 */
export function useLocationLifecycle() {
  const depotsData = useDepots().data;
  const depots = useMemo(() => depotsData ?? [], [depotsData]);
  const ensureFresh = useLocationStore((s) => s.ensureFresh);

  // Auto-resolve on mount once depots are loaded (covers checkAuth path
  // where root _layout.tsx doesn't trigger resolveDepot)
  useEffect(() => {
    if (depots.length > 0) {
      ensureFresh(depots);
    }
  }, [depots, ensureFresh]);

  // Refresh on foreground resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') ensureFresh(depots);
    });
    return () => sub.remove();
  }, [depots, ensureFresh]);
}
