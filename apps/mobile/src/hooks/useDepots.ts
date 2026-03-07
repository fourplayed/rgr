import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listDepots, findNearestLocation, buildDepotLookups } from '@rgr/shared';
import type { Depot } from '@rgr/shared';

/**
 * Query key for depots
 */
export const depotKeys = {
  all: ['depots'] as const,
  list: () => [...depotKeys.all, 'list'] as const,
};

/**
 * Fetch all active depots
 */
export function useDepots() {
  return useQuery({
    queryKey: depotKeys.list(),
    queryFn: async () => {
      const result = await listDepots();

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes - depots don't change often
  });
}

/**
 * Memoized depot lookups with helper methods
 */
export function useDepotLookup() {
  const { data: depots = [] } = useDepots();

  return useMemo(() => {
    const { byCode, byName } = buildDepotLookups(depots);
    return {
      depots,
      byCode,
      byName,
      getColor: (code: string, fallback = '#E8E8E8') =>
        byCode.get(code.toLowerCase())?.color ?? fallback,
      getName: (code: string) => byCode.get(code.toLowerCase())?.name ?? code.toUpperCase(),
    };
  }, [depots]);
}

/**
 * Default maximum distance in km to match a depot
 * Assets scanned further than this won't be auto-assigned
 */
const DEFAULT_MAX_DISTANCE_KM = 50;

/**
 * Find the nearest depot to given coordinates
 * @param latitude - Current latitude
 * @param longitude - Current longitude
 * @param depots - List of depots to search
 * @param maxDistanceKm - Maximum distance threshold (default 50km)
 * @returns Nearest depot and distance, or null if none within threshold
 */
export function findNearestDepot(
  latitude: number,
  longitude: number,
  depots: Depot[],
  maxDistanceKm: number = DEFAULT_MAX_DISTANCE_KM
): { depot: Depot; distanceKm: number } | null {
  const result = findNearestLocation(latitude, longitude, depots, maxDistanceKm);

  if (!result) {
    return null;
  }

  return {
    depot: result.location,
    distanceKm: result.distanceKm,
  };
}
