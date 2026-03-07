import { z } from 'zod';
import { ScanTypeSchema } from '../enums/ScanEnums';
import type { ScanType } from '../enums/ScanEnums';
import type { AssetCategory } from '../enums/AssetEnums';
import { safeParseEnum } from '../../utils/safeParseEnum';

/**
 * ScanEvent — camelCase application interface
 */
export interface ScanEvent {
  id: string;
  assetId: string;
  scannedBy: string | null;
  scanType: ScanType;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  locationDescription: string | null;
  deviceInfo: Record<string, unknown> | null;
  rawScanData: string | null;
  createdAt: string;
}

/**
 * ScanEventRow — snake_case database row type
 */
export interface ScanEventRow {
  id: string;
  asset_id: string;
  scanned_by: string | null;
  scan_type: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  location_description: string | null;
  device_info: Record<string, unknown> | null;
  raw_scan_data: string | null;
  created_at: string;
}

/**
 * ScanEvent with joined scanner profile name
 */
export interface ScanEventWithScanner extends ScanEvent {
  scannerName: string | null;
  assetNumber: string | null;
  assetCategory: AssetCategory | null;
}

/**
 * Input for creating a new scan event
 */
export interface CreateScanEventInput {
  assetId: string;
  scannedBy?: string | null;
  scanType?: ScanType;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  locationDescription?: string | null;
  deviceInfo?: Record<string, unknown> | null;
  rawScanData?: string | null;
}

export const CreateScanEventInputSchema = z.object({
  assetId: z.string().uuid(),
  scannedBy: z.string().uuid().nullable().optional(),
  scanType: ScanTypeSchema.optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  accuracy: z.number().min(0).nullable().optional(),
  altitude: z.number().nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  speed: z.number().min(0).nullable().optional(),
  locationDescription: z.string().max(255).nullable().optional(),
  deviceInfo: z.record(z.unknown()).nullable().optional(),
  rawScanData: z.string().nullable().optional(),
});

// ── Mappers ──

export function mapRowToScanEvent(row: ScanEventRow): ScanEvent {
  return {
    id: row.id,
    assetId: row.asset_id,
    scannedBy: row.scanned_by,
    scanType: safeParseEnum(ScanTypeSchema, row.scan_type, 'qr_scan'),
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    altitude: row.altitude,
    heading: row.heading,
    speed: row.speed,
    locationDescription: row.location_description,
    deviceInfo: row.device_info,
    rawScanData: row.raw_scan_data,
    createdAt: row.created_at,
  };
}

export type ScanEventInsertRow = Omit<ScanEventRow, 'id' | 'created_at'>;

export function mapScanEventToInsert(
  input: CreateScanEventInput
): ScanEventInsertRow {
  return {
    asset_id: input.assetId,
    scanned_by: input.scannedBy ?? null,
    scan_type: input.scanType ?? 'qr_scan',
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    accuracy: input.accuracy ?? null,
    altitude: input.altitude ?? null,
    heading: input.heading ?? null,
    speed: input.speed ?? null,
    location_description: input.locationDescription ?? null,
    device_info: input.deviceInfo ?? null,
    raw_scan_data: input.rawScanData ?? null,
  };
}
