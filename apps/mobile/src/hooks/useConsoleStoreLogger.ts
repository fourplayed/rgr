import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';
import { consoleLog } from '../store/consoleStore';

/**
 * Subscribes to auth and location store changes and logs
 * meaningful transitions to the realtime console.
 */
export function useConsoleStoreLogger() {
  useEffect(() => {
    // Auth store: track authentication state transitions and errors
    let prevAuth = useAuthStore.getState().isAuthenticated;
    let prevAuthError = useAuthStore.getState().authError;

    const authUnsub = useAuthStore.subscribe((state) => {
      if (state.isAuthenticated !== prevAuth) {
        if (state.isAuthenticated) {
          consoleLog('info', 'auth', `Signed in as ${state.user?.email ?? 'unknown'}`);
        } else {
          consoleLog('warn', 'auth', 'Signed out');
        }
        prevAuth = state.isAuthenticated;
      }

      if (state.authError && state.authError !== prevAuthError) {
        consoleLog('error', 'auth', state.authError);
      }
      prevAuthError = state.authError;
    });

    // Location store: track depot resolution and GPS failures
    let prevDepotId = useLocationStore.getState().resolvedDepot?.depot.id ?? null;
    let prevError = useLocationStore.getState().depotResolutionError;
    let prevRetryCount = useLocationStore.getState().retryCount;

    const locationUnsub = useLocationStore.subscribe((state) => {
      const depotId = state.resolvedDepot?.depot.id ?? null;

      if (depotId !== prevDepotId) {
        if (state.resolvedDepot) {
          consoleLog(
            'info',
            'location',
            `Depot resolved: ${state.resolvedDepot.depot.name} (${state.resolvedDepot.distanceKm.toFixed(1)} km)`,
          );
        } else if (prevDepotId) {
          consoleLog('debug', 'location', 'Depot cleared');
        }
        prevDepotId = depotId;
      }

      if (state.depotResolutionError && state.depotResolutionError !== prevError) {
        consoleLog('error', 'location', state.depotResolutionError);
      }
      prevError = state.depotResolutionError;

      if (state.retryCount > prevRetryCount && state.retryCount > 0) {
        consoleLog('warn', 'location', `GPS retry #${state.retryCount}`);
      }
      prevRetryCount = state.retryCount;
    });

    return () => {
      authUnsub();
      locationUnsub();
    };
  }, []);
}
