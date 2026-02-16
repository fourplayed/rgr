/**
 * Location data captured from device geolocation API.
 *
 * Mirrors the fields available from the browser's GeolocationPosition.coords
 * plus the timestamp from GeolocationPosition.
 */
export interface LocationData {
  /** Latitude in decimal degrees */
  latitude: number;

  /** Longitude in decimal degrees */
  longitude: number;

  /** Accuracy of the position in meters */
  accuracy: number;

  /** Altitude in meters above the WGS84 ellipsoid, or null if unavailable */
  altitude: number | null;

  /** Accuracy of the altitude value in meters, or null if unavailable */
  altitudeAccuracy: number | null;

  /** Direction of travel in degrees (0-360), or null if unavailable */
  heading: number | null;

  /** Speed in meters per second, or null if unavailable */
  speed: number | null;

  /** Timestamp (milliseconds since Unix epoch) when the position was acquired */
  timestamp: number;
}
