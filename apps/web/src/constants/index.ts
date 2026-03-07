/**
 * constants/index - Shared constants for the web application
 *
 * TODO: Replace placeholder asset data with real data from the database.
 * This is a stub file providing exports consumed by:
 * - FleetMap.tsx (PLACEHOLDER_ASSETS, STATUS_COLORS, PlaceholderAsset)
 */

// Re-export fleet map constants for convenience
export * from './fleetMap';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Placeholder asset displayed on the fleet map */
export interface PlaceholderAsset {
  /** Unique identifier */
  id: string;
  /** Display name (e.g., asset number) */
  name: string;
  /** Current status (e.g., "serviced", "maintenance", "out_of_service") */
  status: string;
  /** Longitude coordinate */
  lng: number;
  /** Latitude coordinate */
  lat: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Map from asset status to marker color */
export const STATUS_COLORS: Record<string, string> = {
  // TODO: Align with RGR_COLORS semantic palette
  serviced: '#22c55e', // Green
  maintenance: '#f59e0b', // Amber
  out_of_service: '#ef4444', // Red
};

/** Placeholder assets for map rendering before real data is loaded */
export const PLACEHOLDER_ASSETS: PlaceholderAsset[] = [
  // TODO: Replace with live asset data from Supabase
];
