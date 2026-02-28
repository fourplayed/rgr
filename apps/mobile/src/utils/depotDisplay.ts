import type { Depot } from '@rgr/shared';
import { getDepotBadgeColors } from '@rgr/shared';

/** Canonical depot display order */
export const DEPOT_ORDER = ['per', 'new', 'hed', 'kar', 'wub', 'car'];

/** Get depot background color (from DB or fallback) */
export function getDepotColor(depot: Depot): string {
  return depot.color || '#00A8FF';
}

/** Get appropriate text color for a depot chip (contrast-aware) */
export function getDepotTextColor(depot: Depot): string {
  const { text } = getDepotBadgeColors(depot);
  return text;
}

/** Sort depots by canonical DEPOT_ORDER */
export function sortDepotsByOrder(depots: Depot[]): Depot[] {
  return [...depots].sort((a, b) => {
    const aIndex = DEPOT_ORDER.indexOf(a.code.toLowerCase());
    const bIndex = DEPOT_ORDER.indexOf(b.code.toLowerCase());
    const aPos = aIndex === -1 ? 999 : aIndex;
    const bPos = bIndex === -1 ? 999 : bIndex;
    return aPos - bPos;
  });
}
