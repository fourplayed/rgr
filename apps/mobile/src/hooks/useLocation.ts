import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { logger } from '../utils/logger';
import { sanitizeNonNegative } from '../utils/location';
import { useDebugLocationStore } from '../store/debugLocationStore';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
}

export type LocationErrorType = 'permission' | 'timeout' | 'unavailable';

interface UseLocationResult {
  location: LocationData | null;
  error: string | null;
  errorType: LocationErrorType | null;
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
  const [errorType, setErrorType] = useState<LocationErrorType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Inline permission check to avoid ESLint exhaustive-deps warning
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (err: unknown) {
        logger.error('Error checking location permission', err);
        setHasPermission(false);
      }
    })();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to request location permission';
      setError(message);
      return false;
    }
  }, []);

  const requestLocation = useCallback(async (): Promise<LocationData | null> => {
    setIsLoading(true);
    setError(null);
    setErrorType(null);

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
          setLocation(locationData);
          setIsLoading(false);
          return locationData;
        }
      }

      // Re-check permission status directly from the native API to avoid
      // stale state if permissions changed since mount
      let currentStatus: string;
      try {
        ({ status: currentStatus } = await Location.getForegroundPermissionsAsync());
      } catch {
        // Native bridge failure — assume not granted to be safe
        currentStatus = 'undetermined';
      }
      if (currentStatus !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setError('Location permission not granted');
          setErrorType('permission');
          setIsLoading(false);
          return null;
        }
      }

      // Get current location with high accuracy and timeout
      // Timeout prevents iOS from killing the app if GPS hangs
      const result = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }),
        new Promise<never>((_, reject) => {
          timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null;
            reject(new Error('Location request timed out'));
          }, 15000);
        }),
      ]);
      // Clear timeout after successful resolution
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Sanitize GPS values: expo-location returns -1 for heading/speed when unavailable
      // Convert negative values to null to avoid Zod validation failures (min: 0)
      const locationData: LocationData = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        accuracy: sanitizeNonNegative(result.coords.accuracy),
        altitude: result.coords.altitude,
        heading: sanitizeNonNegative(result.coords.heading),
        speed: sanitizeNonNegative(result.coords.speed),
      };

      setLocation(locationData);
      setIsLoading(false);
      return locationData;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get location';
      const isTimeout = message === 'Location request timed out';
      setError(message);
      setErrorType(isTimeout ? 'timeout' : 'unavailable');
      setIsLoading(false);
      return null;
    }
  }, [requestPermission]);

  return {
    location,
    error,
    errorType,
    isLoading,
    requestLocation,
    hasPermission,
    requestPermission,
  };
}
