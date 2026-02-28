import { z } from 'zod';
import { AssetStatusSchema, AssetCategorySchema } from '../enums/AssetEnums';
import type { AssetStatus, AssetCategory } from '../enums/AssetEnums';

/**
 * Trailer subtypes - centralized list for filtering and validation
 */
export const TrailerSubtypes = [
  'Flattop',
  'Dropdeck',
  'Ramp Trailer',
  'Flattop Tautliner',
  'Mezdeck Tautliner',
  'Extendable Flattop',
  'Spreaddeck Ramp Trailer',
  '50t Float',
  '75t Float',
  '100t Float',
  'Flattop A-Trailer',
  'Tautliner A-Trailer',
  'Skel Trailer',
] as const;

export type TrailerSubtype = (typeof TrailerSubtypes)[number];

/**
 * Map of asset categories to their available subtypes
 * Note: Dollies have no subtypes
 */
export const AssetSubtypesByCategory: Record<AssetCategory, readonly string[]> = {
  trailer: TrailerSubtypes,
  dolly: [], // Dollies have no subtypes
};

/**
 * Asset — camelCase application interface
 */
export interface Asset {
  id: string;
  assetNumber: string;
  category: AssetCategory;
  subtype: string | null;
  status: AssetStatus;
  description: string | null;
  yearManufactured: number | null;
  make: string | null;
  model: string | null;
  vin: string | null;
  registrationNumber: string | null;
  registrationExpiry: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastLocationAccuracy: number | null;
  lastLocationUpdatedAt: string | null;
  lastScannedBy: string | null;
  assignedDepotId: string | null;
  assignedDriverId: string | null;
  qrCodeData: string | null;
  qrGeneratedAt: string | null;
  deletedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * AssetRow — snake_case database row type
 */
export interface AssetRow {
  id: string;
  asset_number: string;
  category: string;
  subtype: string | null;
  status: string;
  description: string | null;
  year_manufactured: number | null;
  make: string | null;
  model: string | null;
  vin: string | null;
  registration_number: string | null;
  registration_expiry: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_accuracy: number | null;
  last_location_updated_at: string | null;
  last_scanned_by: string | null;
  assigned_depot_id: string | null;
  assigned_driver_id: string | null;
  qr_code_data: string | null;
  qr_generated_at: string | null;
  deleted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Asset with joined relations (depot name, driver name, etc.)
 */
export interface AssetWithRelations extends Asset {
  depotName: string | null;
  depotCode: string | null;
  driverName: string | null;
  lastScannerName: string | null;
}

/**
 * Input for creating a new asset
 */
export interface CreateAssetInput {
  assetNumber: string;
  category: AssetCategory;
  subtype?: string | null;
  status?: AssetStatus;
  description?: string | null;
  yearManufactured?: number | null;
  make?: string | null;
  model?: string | null;
  vin?: string | null;
  registrationNumber?: string | null;
  registrationExpiry?: string | null;
  assignedDepotId?: string | null;
  assignedDriverId?: string | null;
  notes?: string | null;
}

/**
 * Input for updating an asset
 */
export interface UpdateAssetInput {
  assetNumber?: string;
  category?: AssetCategory;
  subtype?: string | null;
  status?: AssetStatus;
  description?: string | null;
  yearManufactured?: number | null;
  make?: string | null;
  model?: string | null;
  vin?: string | null;
  registrationNumber?: string | null;
  registrationExpiry?: string | null;
  assignedDepotId?: string | null;
  assignedDriverId?: string | null;
  notes?: string | null;
  qrCodeData?: string | null;
  qrGeneratedAt?: string | null;
}

// ── Zod schemas ──

export const CreateAssetInputSchema = z.object({
  assetNumber: z.string().min(1).max(20),
  category: AssetCategorySchema,
  subtype: z.string().max(50).nullable().optional(),
  status: AssetStatusSchema.optional(),
  description: z.string().nullable().optional(),
  yearManufactured: z.number().int().min(1900).max(2100).nullable().optional(),
  make: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  vin: z.string().max(50).nullable().optional(),
  registrationNumber: z.string().max(20).nullable().optional(),
  registrationExpiry: z.string().nullable().optional(),
  assignedDepotId: z.string().uuid().nullable().optional(),
  assignedDriverId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const UpdateAssetInputSchema = CreateAssetInputSchema.partial().extend({
  qrCodeData: z.string().nullable().optional(),
  qrGeneratedAt: z.string().nullable().optional(),
});

// ── Mappers ──

export function mapRowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    assetNumber: row.asset_number,
    category: AssetCategorySchema.parse(row.category),
    subtype: row.subtype,
    status: AssetStatusSchema.parse(row.status),
    description: row.description,
    yearManufactured: row.year_manufactured,
    make: row.make,
    model: row.model,
    vin: row.vin,
    registrationNumber: row.registration_number,
    registrationExpiry: row.registration_expiry,
    lastLatitude: row.last_latitude,
    lastLongitude: row.last_longitude,
    lastLocationAccuracy: row.last_location_accuracy,
    lastLocationUpdatedAt: row.last_location_updated_at,
    lastScannedBy: row.last_scanned_by,
    assignedDepotId: row.assigned_depot_id,
    assignedDriverId: row.assigned_driver_id,
    qrCodeData: row.qr_code_data,
    qrGeneratedAt: row.qr_generated_at,
    deletedAt: row.deleted_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAssetToInsert(
  input: CreateAssetInput
): Record<string, unknown> {
  return {
    asset_number: input.assetNumber,
    category: input.category,
    subtype: input.subtype ?? null,
    status: input.status ?? 'serviced',
    description: input.description ?? null,
    year_manufactured: input.yearManufactured ?? null,
    make: input.make ?? null,
    model: input.model ?? null,
    vin: input.vin ?? null,
    registration_number: input.registrationNumber ?? null,
    registration_expiry: input.registrationExpiry ?? null,
    assigned_depot_id: input.assignedDepotId ?? null,
    assigned_driver_id: input.assignedDriverId ?? null,
    notes: input.notes ?? null,
  };
}

export function mapAssetToUpdate(
  input: UpdateAssetInput
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  if (input.assetNumber !== undefined) updates['asset_number'] = input.assetNumber;
  if (input.category !== undefined) updates['category'] = input.category;
  if (input.subtype !== undefined) updates['subtype'] = input.subtype;
  if (input.status !== undefined) updates['status'] = input.status;
  if (input.description !== undefined) updates['description'] = input.description;
  if (input.yearManufactured !== undefined) updates['year_manufactured'] = input.yearManufactured;
  if (input.make !== undefined) updates['make'] = input.make;
  if (input.model !== undefined) updates['model'] = input.model;
  if (input.vin !== undefined) updates['vin'] = input.vin;
  if (input.registrationNumber !== undefined) updates['registration_number'] = input.registrationNumber;
  if (input.registrationExpiry !== undefined) updates['registration_expiry'] = input.registrationExpiry;
  if (input.assignedDepotId !== undefined) updates['assigned_depot_id'] = input.assignedDepotId;
  if (input.assignedDriverId !== undefined) updates['assigned_driver_id'] = input.assignedDriverId;
  if (input.notes !== undefined) updates['notes'] = input.notes;
  if (input.qrCodeData !== undefined) updates['qr_code_data'] = input.qrCodeData;
  if (input.qrGeneratedAt !== undefined) updates['qr_generated_at'] = input.qrGeneratedAt;

  return updates;
}
