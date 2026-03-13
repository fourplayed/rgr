import { z } from 'zod';
import { PhotoTypeSchema } from '../enums/PhotoEnums';
import type { PhotoType } from '../enums/PhotoEnums';
import { safeParseEnum } from '../../utils/safeParseEnum';
import type { AssertTypesMatch, MustBeTrue } from '../typeAssert';

/**
 * Photo — camelCase application interface
 */
export interface Photo {
  id: string;
  assetId: string | null;
  scanEventId: string | null;
  uploadedBy: string;
  photoType: PhotoType;
  storagePath: string;
  thumbnailPath: string | null;
  filename: string | null;
  fileSize: number | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  locationDescription: string | null;
  latitude: number | null;
  longitude: number | null;
  isAnalyzed: boolean;
  createdAt: string;
}

/**
 * PhotoRow — snake_case database row type
 */
export interface PhotoRow {
  id: string;
  asset_id: string | null;
  scan_event_id: string | null;
  uploaded_by: string;
  photo_type: PhotoType;
  storage_path: string;
  thumbnail_path: string | null;
  filename: string | null;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  location_description: string | null;
  latitude: number | null;
  longitude: number | null;
  is_analyzed: boolean;
  created_at: string;
}

/**
 * Input for creating a photo record
 */
export interface CreatePhotoInput {
  assetId?: string | null | undefined;
  scanEventId?: string | null | undefined;
  uploadedBy: string;
  photoType: PhotoType;
  storagePath: string;
  thumbnailPath?: string | null | undefined;
  filename?: string | null | undefined;
  fileSize?: number | null | undefined;
  mimeType?: string | null | undefined;
  width?: number | null | undefined;
  height?: number | null | undefined;
  locationDescription?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}

// ── Zod schemas ──

export const CreatePhotoInputSchema = z.object({
  assetId: z.string().uuid().nullable().optional(),
  scanEventId: z.string().uuid().nullable().optional(),
  uploadedBy: z.string().uuid(),
  photoType: PhotoTypeSchema,
  storagePath: z.string().min(1),
  thumbnailPath: z.string().nullable().optional(),
  filename: z.string().max(255).nullable().optional(),
  fileSize: z.number().int().min(0).nullable().optional(),
  mimeType: z.string().max(50).nullable().optional(),
  width: z.number().int().min(0).nullable().optional(),
  height: z.number().int().min(0).nullable().optional(),
  locationDescription: z.string().max(255).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

// ── Typed insert row type ──

export type PhotoInsertRow = Omit<PhotoRow, 'id' | 'created_at' | 'is_analyzed'>;

// ── Mappers ──

export function mapRowToPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    assetId: row.asset_id,
    scanEventId: row.scan_event_id,
    uploadedBy: row.uploaded_by,
    photoType: safeParseEnum(PhotoTypeSchema, row.photo_type, 'freight'),
    storagePath: row.storage_path,
    thumbnailPath: row.thumbnail_path,
    filename: row.filename,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    locationDescription: row.location_description,
    latitude: row.latitude,
    longitude: row.longitude,
    isAnalyzed: row.is_analyzed,
    createdAt: row.created_at,
  };
}

export function mapPhotoToInsert(input: CreatePhotoInput): PhotoInsertRow {
  return {
    asset_id: input.assetId ?? null,
    scan_event_id: input.scanEventId ?? null,
    uploaded_by: input.uploadedBy,
    photo_type: input.photoType,
    storage_path: input.storagePath,
    thumbnail_path: input.thumbnailPath ?? null,
    filename: input.filename ?? null,
    file_size: input.fileSize ?? null,
    mime_type: input.mimeType ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    location_description: input.locationDescription ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  };
}

// Compile-time schema <-> interface drift detection
type _CreatePhotoCheck = MustBeTrue<
  AssertTypesMatch<z.infer<typeof CreatePhotoInputSchema>, CreatePhotoInput>
>;
