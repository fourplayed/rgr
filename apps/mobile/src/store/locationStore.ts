import { create } from 'zustand';
import * as Location from 'expo-location';
import { listDepots, findNearestLocation } from '@rgr/shared';
import type { Depot } from '@rgr/shared';

const MAX_DEPOT_DISTANCE_KM = 100;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface CachedLocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
}

interface LocationState {
  resolvedDepot: { depot: Depot; distanceKm: number } | null;
  isResolvingDepot: boolean;
  depotResolutionError: string | null;
  lastResolvedAt: Date | null;
  lastLocation: CachedLocationData | null;

  resolveDepot: () => Promise<void>;
  clearResolvedDepot: () => void;
  isLocationStale: () => boolean;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  resolvedDepot: null,
  isResolvingDepot: false,
  depotResolutionError: null,
  lastResolvedAt: null,
  lastLocation: null,

  resolveDepot: async () => {
    // Don't resolve if already resolving
    if (get().isResolvingDepot) {
      return;
    }

    set({ isResolvingDepot: true, depotResolutionError: null });

    try {
      // Check permission first
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') {
          set({
            isResolvingDepot: false,
            depotResolutionError: 'Location permission denied',
            resolvedDepot: null,
          });
          return;
        }
      }

      // Get current location with timeout
      const locationResult = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Location request timed out')), 15000)
        ),
      ]);

      const { coords } = locationResult;

      // Sanitize GPS values: expo-location returns -1 for heading/speed when unavailable
      const sanitizeNonNegative = (val: number | null): number | null =>
        val !== null && val >= 0 ? val : null;

      const cachedLocation: CachedLocationData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: sanitizeNonNegative(coords.accuracy),
        altitude: coords.altitude,
        heading: sanitizeNonNegative(coords.heading),
        speed: sanitizeNonNegative(coords.speed),
      };

      // Fetch depots
      const depotsResult = await listDepots();
      if (!depotsResult.success || !depotsResult.data) {
        set({
          isResolvingDepot: false,
          depotResolutionError: 'Failed to fetch depots',
          lastLocation: cachedLocation,
          lastResolvedAt: new Date(),
        });
        return;
      }

      // Find nearest depot within threshold
      const nearestResult = findNearestLocation(
        coords.latitude,
        coords.longitude,
        depotsResult.data,
        MAX_DEPOT_DISTANCE_KM
      );

      set({
        isResolvingDepot: false,
        depotResolutionError: null,
        resolvedDepot: nearestResult
          ? { depot: nearestResult.location, distanceKm: nearestResult.distanceKm }
          : null,
        lastLocation: cachedLocation,
        lastResolvedAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resolve depot';
      set({
        isResolvingDepot: false,
        depotResolutionError: message,
        resolvedDepot: null,
      });
    }
  },

  clearResolvedDepot: () => {
    set({
      resolvedDepot: null,
      isResolvingDepot: false,
      depotResolutionError: null,
      lastResolvedAt: null,
      lastLocation: null,
    });
  },

  isLocationStale: () => {
    const { lastResolvedAt } = get();
    if (!lastResolvedAt) {
      return true;
    }
    return Date.now() - lastResolvedAt.getTime() > CACHE_DURATION_MS;
  },
}));
