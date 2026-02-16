/**
 * fleetMap constants - Depot locations and colors for the fleet map
 *
 * TODO: Replace placeholder depot data with real depot records from the database.
 * This is a stub file providing exports consumed by:
 * - FleetMap.tsx (DEPOT_LOCATIONS, DEPOT_COLOR, DEPOT_COLORS, DepotLocation)
 * - DepotHoverCard.tsx (DepotLocation)
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
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Default depot marker color */
export const DEPOT_COLOR = '#9ca3af'; // Gray fallback for unknown depots

/** Per-depot marker colors keyed by depot name */
export const DEPOT_COLORS: Record<string, string> = {
  // TODO: Populate with actual depot-specific colors
  Perth: '#22c55e',
  Newman: '#0000FF',
  Hedland: '#ff10f0',
  Karratha: '#d4ff00',
  Wubin: '#facc15',
  Carnarvon: '#38bdf8',
};

/** Placeholder depot locations for map rendering */
export const DEPOT_LOCATIONS: DepotLocation[] = [
  // TODO: Replace with real depot data from the database
  {
    name: 'Perth',
    lng: 115.8605,
    lat: -31.9505,
    trailers: 0,
    dollies: 0,
  },
  {
    name: 'Newman',
    lng: 119.7320,
    lat: -23.3541,
    trailers: 0,
    dollies: 0,
  },
  {
    name: 'Hedland',
    lng: 118.5919,
    lat: -20.3106,
    trailers: 0,
    dollies: 0,
  },
  {
    name: 'Karratha',
    lng: 116.8463,
    lat: -20.7372,
    trailers: 0,
    dollies: 0,
  },
  {
    name: 'Carnarvon',
    lng: 113.6594,
    lat: -24.8841,
    trailers: 0,
    dollies: 0,
  },
  {
    name: 'Wubin',
    lng: 116.6281,
    lat: -30.1075,
    trailers: 0,
    dollies: 0,
  },
];
