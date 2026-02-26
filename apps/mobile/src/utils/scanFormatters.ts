/**
 * Shared utility functions for formatting scan data
 */

import type { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

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

