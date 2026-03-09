import type { Depot } from '../types';

const DEFAULT_DEPOT_COLOR = '#9ca3af';

/** Build fast lookup maps from a Depot array */
export function buildDepotLookups(depots: Depot[]) {
  const byCode = new Map<string, Depot>();
  const byName = new Map<string, Depot>();
  for (const depot of depots) {
    byCode.set(depot.code.toLowerCase(), depot);
    byName.set(depot.name.toLowerCase(), depot);
  }
  return { byCode, byName };
}

/** Get a depot's color by its code (case-insensitive), with fallback */
export function getDepotColorByCode(
  depots: Depot[],
  code: string,
  fallback = DEFAULT_DEPOT_COLOR
): string {
  const lc = code.toLowerCase();
  const depot = depots.find((d) => d.code.toLowerCase() === lc);
  return depot?.color ?? fallback;
}

/** Find a depot by matching its name in a location description string */
export function findDepotByLocationString(
  locationDescription: string,
  depots: Depot[]
): Depot | null {
  const location = locationDescription.toLowerCase();
  return depots.find((d) => location.includes(d.name.toLowerCase())) ?? null;
}

/** Get badge colors for a depot (background + text) */
export function getDepotBadgeColors(
  depot: Depot | null,
  fallbackBg = '#E8E8E8',
  fallbackText = '#1E293B'
): { bg: string; text: string } {
  if (!depot?.color) return { bg: fallbackBg, text: fallbackText };
  const isLight = isLightColor(depot.color);
  return { bg: depot.color, text: isLight ? '#1E293B' : '#FFFFFF' };
}

/** Simple luminance check for hex colors (supports 3-digit and 6-digit hex) */
function isLightColor(hex: string): boolean {
  let c = hex.replace('#', '');
  // Expand 3-digit hex to 6-digit (e.g., "f0a" → "ff00aa")
  if (c.length === 3) {
    c = c.charAt(0) + c.charAt(0) + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2);
  }
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
