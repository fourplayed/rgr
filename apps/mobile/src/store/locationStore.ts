import { create } from 'zustand';
import * as Location from 'expo-location';
import { findNearestLocation } from '@rgr/shared';
import type { Depot } from '@rgr/shared';
import { eventBus, AppEvents } from '../utils/eventBus';
import { sanitizeNonNegative } from '../utils/location';
import { useDebugLocationStore } from './debugLocationStore';

// Configuration constants
const MAX_DEPOT_DISTANCE_KM = 100;
const LOCATION_TIMEOUT_MS = 10000; // 10 seconds — high-accuracy GPS attempt
const BALANCED_TIMEOUT_MS = 8000; // 8 seconds — cell/Wi-Fi fallback (faster indoors)
const RESOLVE_COOLDOWN_MS = 30_000; // 30 seconds — prevents rapid successive GPS queries
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes — triggers background refresh
const MAX_RETRIES = 5;
const BASE_RETRY_MS = 5000; // 5s base, doubles each attempt, caps at 60s
const MAX_RETRY_MS = 60000;

export interface CachedLocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface LocationState {
  resolvedDepot: { depot: Depot; distanceKm: number } | null;
  isResolvingDepot: boolean;
  depotResolutionError: string | null;
  lastResolvedAt: Date | null;
  lastLocation: CachedLocationData | null;
  retryCount: number;
  retryTimeoutId: ReturnType<typeof setTimeout> | null;
  permissionDenied: boolean;

  resolveDepot: (depots: Depot[]) => Promise<void>;
  ensureFresh: (depots: Depot[]) => void;
  cancelRetries: () => void;
  clearResolvedDepot: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  resolvedDepot: null,
  isResolvingDepot: false,
  depotResolutionError: null,
  lastResolvedAt: null,
  lastLocation: null,
  retryCount: 0,
  retryTimeoutId: null,
  permissionDenied: false,

  resolveDepot: async (depots: Depot[]) => {
    // Don't resolve if already resolving
    if (get().isResolvingDepot) {
      return;
    }

    // Rate-limit: skip if successfully resolved within cooldown period
    const { lastResolvedAt, resolvedDepot } = get();
    if (
      resolvedDepot &&
      lastResolvedAt &&
      Date.now() - lastResolvedAt.getTime() < RESOLVE_COOLDOWN_MS
    ) {
      return;
    }

    set({ isResolvingDepot: true, depotResolutionError: null });

    try {
      // DEV-only: use simulated GPS when debug override is active
      const debugLocation = __DEV__ ? useDebugLocationStore.getState() : null;
      const useSimulatedGPS = debugLocation?.overrideEnabled === true;

      // Check permission first (skip when using simulated location)
      if (!useSimulatedGPS) {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
          if (newStatus !== 'granted') {
            set({
              isResolvingDepot: false,
              depotResolutionError: 'Location permission denied',
              resolvedDepot: null,
              permissionDenied: true,
            });
            // Permission denied — do NOT retry (user action required)
            return;
          }
        }
      }

      // Get GPS position (depot list is now provided by caller from React Query cache)
      let locationResult: Location.LocationObject;

      if (useSimulatedGPS && debugLocation) {
        locationResult = {
          coords: {
            latitude: debugLocation.latitude,
            longitude: debugLocation.longitude,
            accuracy: 5,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as Location.LocationObject;
      } else {
        // Accuracy fallback: try High first, fall back to Balanced on timeout
        try {
          locationResult = await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error('Location request timed out')),
                LOCATION_TIMEOUT_MS
              )
            ),
          ]);
        } catch {
          // High accuracy timed out — try Balanced (cell/Wi-Fi, faster indoors)
          try {
            locationResult = await Promise.race([
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              }),
              new Promise<never>((_, reject) =>
                setTimeout(
                  () => reject(new Error('Location request timed out')),
                  BALANCED_TIMEOUT_MS
                )
              ),
            ]);
          } catch (error: unknown) {
            // Both attempts failed — schedule retry with exponential backoff
            const { retryCount, retryTimeoutId: existingTimeout } = get();
            if (retryCount < MAX_RETRIES) {
              // Clear any existing retry to prevent concurrent timeout overwrites
              if (existingTimeout) clearTimeout(existingTimeout);
              const delay = Math.min(BASE_RETRY_MS * Math.pow(2, retryCount), MAX_RETRY_MS);
              const jitteredDelay = delay * (1 + Math.random() * 0.5);
              // Store depots in state so retry uses the latest list, not a stale closure
              const timeoutId = setTimeout(() => {
                set({ retryTimeoutId: null });
                // Re-read depots from the caller — the ensureFresh/resolveDepot callers
                // always pass fresh depots from React Query cache
                get().resolveDepot(depots);
              }, jitteredDelay);
              set({ retryTimeoutId: timeoutId });
            }

            const message = error instanceof Error ? error.message : 'Failed to resolve depot';
            set({
              isResolvingDepot: false,
              depotResolutionError: message,
              resolvedDepot: null,
              retryCount: get().retryCount + 1,
            });
            return;
          }
        }
      }

      const { coords } = locationResult;

      // Sanitize GPS values: expo-location returns -1 for heading/speed when unavailable
      const cachedLocation: CachedLocationData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: sanitizeNonNegative(coords.accuracy),
        altitude: coords.altitude,
        heading: sanitizeNonNegative(coords.heading),
        speed: sanitizeNonNegative(coords.speed),
        timestamp: locationResult.timestamp,
      };

      // Find nearest depot within threshold
      const nearestResult = findNearestLocation(
        coords.latitude,
        coords.longitude,
        depots,
        MAX_DEPOT_DISTANCE_KM
      );

      // Success — reset retry counter, clear any pending timeout
      const pendingTimeout = get().retryTimeoutId;
      if (pendingTimeout) clearTimeout(pendingTimeout);

      set({
        isResolvingDepot: false,
        depotResolutionError: null,
        resolvedDepot: nearestResult
          ? { depot: nearestResult.location, distanceKm: nearestResult.distanceKm }
          : null,
        lastLocation: cachedLocation,
        lastResolvedAt: new Date(),
        retryCount: 0,
        retryTimeoutId: null,
        permissionDenied: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to resolve depot';
      set({
        isResolvingDepot: false,
        depotResolutionError: message,
        resolvedDepot: null,
      });
    }
  },

  ensureFresh: (depots: Depot[]) => {
    const { lastResolvedAt, isResolvingDepot, permissionDenied } = get();
    if (isResolvingDepot || permissionDenied) return;

    const isStale =
      !lastResolvedAt || Date.now() - lastResolvedAt.getTime() > STALE_THRESHOLD_MS;

    if (isStale) {
      get().resolveDepot(depots);
    }
  },

  cancelRetries: () => {
    const { retryTimeoutId } = get();
    if (retryTimeoutId) clearTimeout(retryTimeoutId);
    set({ retryCount: 0, retryTimeoutId: null });
  },

  clearResolvedDepot: () => {
    get().cancelRetries();
    set({
      resolvedDepot: null,
      isResolvingDepot: false,
      depotResolutionError: null,
      lastResolvedAt: null,
      lastLocation: null,
      permissionDenied: false,
    });
  },
}));

/**
 * Wait for an in-flight GPS resolution to complete.
 * Returns `true` if `lastLocation` becomes non-null, `false` on timeout or failure.
 * Resolves immediately if location already exists or nothing is resolving.
 */
export function waitForLocationResolution(timeoutMs = 15_000): Promise<boolean> {
  return new Promise((resolve) => {
    const current = useLocationStore.getState();
    if (current.lastLocation) { resolve(true); return; }
    if (!current.isResolvingDepot) { resolve(false); return; }

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve(false);
    }, timeoutMs);

    const unsubscribe = useLocationStore.subscribe((state) => {
      if (!state.isResolvingDepot) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        unsubscribe();
        resolve(state.lastLocation !== null);
      }
    });
  });
}

// Subscribe to app events for cross-store coordination
// This decouples locationStore from authStore
eventBus.on(AppEvents.USER_LOGOUT, () => {
  useLocationStore.getState().clearResolvedDepot();
});
