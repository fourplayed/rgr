import { z } from 'zod';

/**
 * Photo — camelCase application interface
 */
export interface Photo {
  id: string;
  assetId: string | null;
  scanEventId: string | null;
  uploadedBy: string;
  photoType: string;
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
  photo_type: string;
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
  assetId?: string | null;
  scanEventId?: string | null;
  uploadedBy: string;
  photoType: string;
  storagePath: string;
  thumbnailPath?: string | null;
  filename?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  locationDescription?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

// ── Zod schemas ──

export const CreatePhotoInputSchema = z.object({
  assetId: z.string().uuid().nullable().optional(),
  scanEventId: z.string().uuid().nullable().optional(),
  uploadedBy: z.string().uuid(),
  photoType: z.string().min(1).max(50),
  storagePath: z.string().min(1),
  thumbnailPath: z.string().nullable().optional(),
  filename: z.string().max(255).nullable().optional(),
  fileSize: z.number().int().min(0).nullable().optional(),
  mimeType: z.string().max(100).nullable().optional(),
  width: z.number().int().min(0).nullable().optional(),
  height: z.number().int().min(0).nullable().optional(),
  locationDescription: z.string().max(255).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

// ── Mappers ──

export function mapRowToPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    assetId: row.asset_id,
    scanEventId: row.scan_event_id,
    uploadedBy: row.uploaded_by,
    photoType: row.photo_type,
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

export function mapPhotoToInsert(
  input: CreatePhotoInput
): Record<string, unknown> {
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
