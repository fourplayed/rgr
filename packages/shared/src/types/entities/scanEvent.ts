import { z } from 'zod';
import { ScanTypeSchema } from '../enums/ScanEnums';
import type { ScanType } from '../enums/ScanEnums';
import type { AssetCategory } from '../enums/AssetEnums';
import type { Json } from '../database.types';
import { safeParseEnum } from '../../utils/safeParseEnum';
import type { AssertTypesMatch, MustBeTrue } from '../typeAssert';

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
  deviceInfo: Json | null;
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
  scan_type: ScanType;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  location_description: string | null;
  device_info: Json | null;
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
  scannedBy?: string | null | undefined;
  scanType?: ScanType | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  accuracy?: number | null | undefined;
  altitude?: number | null | undefined;
  heading?: number | null | undefined;
  speed?: number | null | undefined;
  locationDescription?: string | null | undefined;
  deviceInfo?: Json | null | undefined;
  rawScanData?: string | null | undefined;
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
  deviceInfo: z.record(z.string(), z.unknown()).nullable().optional(),
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

export function mapScanEventToInsert(input: CreateScanEventInput): ScanEventInsertRow {
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

// Compile-time schema <-> interface drift detection
// CONCERN (Task 2): deviceInfo uses z.record(z.string(), z.unknown()) in schema vs Json in interface.
// These are structurally incompatible — Task 2 will replace Json with a Zod-compatible branded type.
type _CreateScanEventCheck = MustBeTrue<
  // @ts-expect-error TS2344: Known Json/z.record mismatch — tracked in Task 2
  AssertTypesMatch<z.infer<typeof CreateScanEventInputSchema>, CreateScanEventInput>
>;
