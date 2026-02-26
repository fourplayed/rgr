/**
 * fleetMap constants - Types and defaults for the fleet map
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Depot location data displayed on the fleet map */
export interface DepotLocation {
  /** Depot display name */
  name: string;
  /** Longitude coordinate */
  lng: number;
  /** Latitude coordinate */
  lat: number;
  /** Number of trailers at this depot */
  trailers: number;
  /** Number of dollies at this depot */
  dollies: number;
  /** Depot marker color */
  color: string;
}
