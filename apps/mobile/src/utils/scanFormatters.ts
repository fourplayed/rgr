/**
 * Shared utility functions for formatting scan and depot data
 * Extracted from home.tsx and assets/[id].tsx to eliminate duplication
 */

import type { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * Depot display names mapped by code
 */
export const DEPOT_NAMES: Record<string, string> = {
  kar: 'Karratha',
  per: 'Perth',
  wub: 'Wubin',
  new: 'Newman',
  hed: 'Hedland',
  car: 'Carnarvon',
};

/**
 * Get the appropriate icon for a scan type
 */
export function getScanTypeIcon(scanType: string): keyof typeof Ionicons.glyphMap {
  switch (scanType) {
    case 'qr_scan':
    case 'nfc_scan':
    case 'gps_auto':
    case 'manual_entry':
      return 'qr-code-outline';
    case 'photo_upload':
      return 'camera-outline';
    case 'maintenance':
      return 'construct-outline';
    default:
      return 'scan-outline';
  }
}

/**
 * Get the color associated with a scan type
 */
export function getScanTypeColor(scanType: string): string {
  switch (scanType) {
    case 'qr_scan':
    case 'nfc_scan':
    case 'gps_auto':
    case 'manual_entry':
      return colors.electricBlue;
    case 'photo_upload':
      return colors.status.active; // Green
    case 'maintenance':
      return colors.status.maintenance; // Orange
    default:
      return colors.electricBlue;
  }
}

/**
 * Format a scan type string for display
 * e.g., 'qr_scan' -> 'QR Scan'
 */
export function formatScanTypeLabel(scanType: string): string {
  return scanType
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => {
      const upper = word.toUpperCase();
      if (upper === 'QR' || upper === 'NFC' || upper === 'GPS') {
        return upper;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Extract depot code from a location description string
 */
export function getDepotCodeFromLocation(locationDescription: string): keyof typeof colors.depot | null {
  const location = locationDescription.toLowerCase();
  if (location.includes('karratha')) return 'kar';
  if (location.includes('perth')) return 'per';
  if (location.includes('wubin')) return 'wub';
  if (location.includes('newman')) return 'new';
  if (location.includes('hedland')) return 'hed';
  if (location.includes('carnarvon')) return 'car';
  return null;
}

/**
 * Get background and text colors for a location badge
 */
export function getLocationBadgeColors(locationDescription: string): { bg: string; text: string } {
  const depotCode = getDepotCodeFromLocation(locationDescription);
  if (!depotCode) {
    return { bg: colors.chrome, text: colors.text };
  }
  const bg = colors.depot[depotCode];
  // Karratha uses yellow background, so use dark text
  const text = depotCode === 'kar' ? colors.text : colors.textInverse;
  return { bg, text };
}

/**
 * Check if a string is a valid depot code
 */
export function isValidDepotCode(code: string): code is keyof typeof colors.depot {
  return code in colors.depot;
}
