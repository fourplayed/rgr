/**
 * Location utilities for distance calculations
 */

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 - Latitude of first point in degrees
 * @param lon1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lon2 - Longitude of second point in degrees
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Find the nearest location from a list of locations with coordinates
 * @param lat - Current latitude
 * @param lon - Current longitude
 * @param locations - Array of locations with latitude/longitude
 * @param maxDistanceKm - Maximum distance threshold in km (optional)
 * @returns The nearest location and its distance, or null if none within threshold
 */
export function findNearestLocation<
  T extends { latitude: number | null; longitude: number | null },
>(
  lat: number,
  lon: number,
  locations: T[],
  maxDistanceKm?: number
): { location: T; distanceKm: number } | null {
  let nearest: T | null = null;
  let nearestDistance = Infinity;

  for (const location of locations) {
    if (location.latitude === null || location.longitude === null) {
      continue;
    }

    const distance = calculateDistance(lat, lon, location.latitude, location.longitude);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = location;
    }
  }

  if (!nearest) {
    return null;
  }

  if (maxDistanceKm !== undefined && nearestDistance > maxDistanceKm) {
    return null;
  }

  return { location: nearest, distanceKm: nearestDistance };
}
