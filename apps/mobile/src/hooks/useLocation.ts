import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { logger } from '../utils/logger';
import { useDebugLocationStore } from '../store/debugLocationStore';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
}

interface UseLocationResult {
  location: LocationData | null;
  error: string | null;
  isLoading: boolean;
  requestLocation: () => Promise<LocationData | null>;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook for accessing device location with expo-location
 */
export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Inline permission check to avoid ESLint exhaustive-deps warning
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (isMountedRef.current) {
          setHasPermission(status === 'granted');
        }
      } catch (err) {
        logger.error('Error checking location permission', err);
        if (isMountedRef.current) {
          setHasPermission(false);
        }
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      if (isMountedRef.current) {
        setHasPermission(granted);
      }
      return granted;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request location permission';
      if (isMountedRef.current) {
        setError(message);
      }
      return false;
    }
  }, []);

  const requestLocation = useCallback(async (): Promise<LocationData | null> => {
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      // DEV-only: return simulated location if debug override is active
      if (__DEV__) {
        const debugState = useDebugLocationStore.getState();
        if (debugState.overrideEnabled) {
          const locationData: LocationData = {
            latitude: debugState.latitude,
            longitude: debugState.longitude,
            accuracy: 5,
            altitude: null,
            heading: null,
            speed: null,
          };
          if (isMountedRef.current) {
            setLocation(locationData);
            setIsLoading(false);
          }
          return locationData;
        }
      }

      // Check permission first
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('Location permission not granted');
        }
      }

      // Get current location with high accuracy and timeout
      // Timeout prevents iOS from killing the app if GPS hangs
      const result = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Location request timed out')), 15000)
        ),
      ]);

      // Sanitize GPS values: expo-location returns -1 for heading/speed when unavailable
      // Convert negative values to null to avoid Zod validation failures (min: 0)
      const sanitizeNonNegative = (val: number | null): number | null =>
        val !== null && val >= 0 ? val : null;

      const locationData: LocationData = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        accuracy: sanitizeNonNegative(result.coords.accuracy),
        altitude: result.coords.altitude,
        heading: sanitizeNonNegative(result.coords.heading),
        speed: sanitizeNonNegative(result.coords.speed),
      };

      if (isMountedRef.current) {
        setLocation(locationData);
        setIsLoading(false);
      }
      return locationData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get location';
      if (isMountedRef.current) {
        setError(message);
        setIsLoading(false);
      }
      return null;
    }
  }, [hasPermission, requestPermission]);

  return {
    location,
    error,
    isLoading,
    requestLocation,
    hasPermission,
    requestPermission,
  };
}
