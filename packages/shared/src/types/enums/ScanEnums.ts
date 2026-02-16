import { z } from 'zod';

/**
 * Scan type enum — matches DB: scan_type
 */
export const ScanType = {
  QR_SCAN: 'qr_scan',
  MANUAL_ENTRY: 'manual_entry',
  NFC_SCAN: 'nfc_scan',
  GPS_AUTO: 'gps_auto',
} as const;

export type ScanType = (typeof ScanType)[keyof typeof ScanType];

export const ScanTypeSchema = z.enum(['qr_scan', 'manual_entry', 'nfc_scan', 'gps_auto']);

export const ScanTypeLabels: Record<ScanType, string> = {
  qr_scan: 'QR Scan',
  manual_entry: 'Manual Entry',
  nfc_scan: 'NFC Scan',
  gps_auto: 'GPS Auto',
};
