import { create } from 'zustand';
import * as Location from 'expo-location';
import { findNearestLocation } from '@rgr/shared';
import type { Depot } from '@rgr/shared';
import { eventBus, AppEvents } from '../utils/eventBus';
import { sanitizeNonNegative } from '../utils/location';
import { useDebugLocationStore } from './debugLocationStore';

// Configuration constants
const MAX_DEPOT_DISTANCE_KM = 100;
const LOCATION_TIMEOUT_MS = 15000; // 15 seconds - GPS timeout for indoor environments

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

  resolveDepot: (depots: Depot[]) => Promise<void>;
  clearResolvedDepot: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  resolvedDepot: null,
  isResolvingDepot: false,
  depotResolutionError: null,
  lastResolvedAt: null,
  lastLocation: null,

  resolveDepot: async (depots: Depot[]) => {
    // Don't resolve if already resolving
    if (get().isResolvingDepot) {
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
            });
            return;
          }
        }
      }

      // Get GPS position (depot list is now provided by caller from React Query cache)
      const locationPromise: Promise<Location.LocationObject> = useSimulatedGPS
        ? Promise.resolve({
            coords: {
              latitude: debugLocation!.latitude,
              longitude: debugLocation!.longitude,
              accuracy: 5,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as Location.LocationObject)
        : Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Location request timed out')), LOCATION_TIMEOUT_MS)
            ),
          ]);

      let locationResult: Location.LocationObject;
      try {
        locationResult = await locationPromise;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to resolve depot';
        set({
          isResolvingDepot: false,
          depotResolutionError: message,
          resolvedDepot: null,
        });
        return;
      }

      const depotList = depots;

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
        depotList,
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

}));

// Subscribe to app events for cross-store coordination
// This decouples locationStore from authStore
eventBus.on(AppEvents.USER_LOGOUT, () => {
  useLocationStore.getState().clearResolvedDepot();
});
