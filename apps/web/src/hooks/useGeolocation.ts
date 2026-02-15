/**
 * useGeolocation - Simple geolocation hook for web
 */
import { useState, useCallback } from 'react';
import type { LocationData } from '@rgr/shared';

export function useGeolocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('Geolocation not supported');
      return null;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };
          setLocation(loc);
          setLoading(false);
          resolve(loc);
        },
        (err) => {
          const msg = err.code === 1 ? 'Location permission denied' :
                      err.code === 2 ? 'Location unavailable' :
                      'Location request timed out';
          setError(msg);
          setLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }, []);

  return { location, loading, error, getCurrentLocation };
}
