import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { useDepots } from './useDepots';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';
import { captureMessage } from '../utils/errorReporting';

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
  const resolvedDepot = useLocationStore((s) => s.resolvedDepot);
  const user = useAuthStore((s) => s.user);
  const updateUserProfile = useAuthStore((s) => s.updateUserProfile);
  const hasAutoAssignedRef = useRef(false);

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

  // Auto-persist GPS-resolved depot to profile when user has no assigned depot.
  // Fire-and-forget — does not block UX. Runs once per session (ref guard).
  useEffect(() => {
    if (
      hasAutoAssignedRef.current ||
      !resolvedDepot ||
      !user ||
      user.depot !== null
    ) return;

    hasAutoAssignedRef.current = true;

    updateUserProfile({ depot: resolvedDepot.depot.code }).then((result) => {
      if (!result.success) {
        hasAutoAssignedRef.current = false; // allow retry on next resolution
        captureMessage(`Auto-depot assign failed: ${result.error}`, {
          source: 'location',
          extra: { depotCode: resolvedDepot.depot.code, userId: user.id },
        });
      }
    });
  }, [resolvedDepot, user, updateUserProfile]);
}
