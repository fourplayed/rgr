import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

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

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (err) {
      console.error('Error checking location permission:', err);
      setHasPermission(false);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request location permission';
      setError(message);
      return false;
    }
  }, []);

  const requestLocation = useCallback(async (): Promise<LocationData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check permission first
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('Location permission not granted');
        }
      }

      // Get current location with high accuracy
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        accuracy: result.coords.accuracy,
        altitude: result.coords.altitude,
        heading: result.coords.heading,
        speed: result.coords.speed,
      };

      setLocation(locationData);
      setIsLoading(false);
      return locationData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get location';
      setError(message);
      setIsLoading(false);
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
