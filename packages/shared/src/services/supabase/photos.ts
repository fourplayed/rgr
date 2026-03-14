import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';
import { withRetry } from '../../utils/withRetry';
import type {
  Photo,
  PhotoRow,
  CreatePhotoInput,
  FreightAnalysis,
  HazardAlert,
} from '../../types/entities';
import type { PhotoType } from '../../types/enums/PhotoEnums';
import { PhotoTypeSchema } from '../../types/enums/PhotoEnums';
import type { HazardSeverity } from '../../types/enums/HazardEnums';
import { HazardSeveritySchema } from '../../types/enums/HazardEnums';
import { safeParseEnum } from '../../utils/safeParseEnum';
import { SUPPORTED_IMAGE_TYPES } from '../../utils/constants';
import type { FreightAnalysisRow } from '../../types/entities/freightAnalysis';
import type { HazardAlertRow } from '../../types/entities/hazardAlert';
import {
  mapRowToPhoto,
  mapPhotoToInsert,
  CreatePhotoInputSchema,
} from '../../types/entities/photo';
import { mapRowToFreightAnalysis } from '../../types/entities/freightAnalysis';
import { mapRowToHazardAlert } from '../../types/entities/hazardAlert';
import {
  MAX_PHOTO_SIZE_BYTES,
  STORAGE_BUCKETS,
  isValidUUID,
  isValidISOTimestamp,
} from '../../utils/constants';
import { validateQueryResult } from '../../utils';
import { PhotoWithAnalysisResponseSchema } from '../../types/entities/responseSchemas';

/**
 * Generate a unique ID for filenames.
 * Uses timestamp + random string, which is sufficient for storage paths.
 */
function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

// ── Types ──

export interface PhotoWithAnalysis extends Photo {
  freightAnalysis: FreightAnalysis | null;
  hazardAlerts: HazardAlert[];
}

/** Optimized photo list item - excludes raw_response JSONB for performance */
export interface PhotoListItem {
  id: string;
  storagePath: string;
  thumbnailPath: string | null;
  photoType: PhotoType;
  createdAt: string;
  // Analysis summary (excluding raw_response)
  primaryCategory: string | null;
  confidence: number | null;
  hazardCount: number;
  maxSeverity: HazardSeverity | null;
  requiresAcknowledgment: boolean;
  blockedFromDeparture: boolean;
}

export interface UploadPhotoOptions {
  assetId: string;
  scanEventId?: string | null;
  uploadedBy: string;
  photoType: PhotoType;
  fileUri: string;
  mimeType?: string;
  locationDescription?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  width?: number;
  height?: number;
  thumbnailFileUri?: string;
}

// ── Photo CRUD ──

/**
 * Upload a photo to Supabase storage and create a database record.
 * Storage path: photos/{assetId}/{timestamp}_{uuid}.jpg
 */
export async function uploadPhoto(options: UploadPhotoOptions): Promise<ServiceResult<Photo>> {
  const {
    assetId,
    scanEventId,
    uploadedBy,
    photoType,
    fileUri,
    mimeType = 'image/jpeg',
    locationDescription,
    latitude,
    longitude,
    width,
    height,
    thumbnailFileUri,
  } = options;

  if (!SUPPORTED_IMAGE_TYPES.includes(mimeType as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
    return { success: false, data: null, error: `Unsupported image type: ${mimeType}` };
  }

  const supabase = getSupabaseClient();

  // Generate unique filename
  const timestamp = Date.now();
  const uniqueId = generateUniqueId();
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  const filename = `${timestamp}_${uniqueId}.${extension}`;
  const storagePath = `photos/${assetId}/${filename}`;

  try {
    // Fetch the file as ArrayBuffer (more reliable in React Native than blob)
    const response = await fetch(fileUri);
    const arrayBuffer = await response.arrayBuffer();

    // Validate we actually have data
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return { success: false, data: null, error: 'Failed to read photo file: empty content' };
    }

    // Validate file size before uploading
    if (arrayBuffer.byteLength > MAX_PHOTO_SIZE_BYTES) {
      return {
        success: false,
        data: null,
        error: `Photo exceeds maximum size of ${MAX_PHOTO_SIZE_BYTES / (1024 * 1024)}MB`,
      };
    }

    // Convert to Uint8Array for Supabase upload
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase storage with retry for transient network failures
    const { error: uploadError } = await withRetry(
      () =>
        supabase.storage
          .from(STORAGE_BUCKETS.photos)
          .upload(storagePath, uint8Array, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false,
          })
          .then((result) => {
            if (result.error) throw result.error;
            return result;
          }),
      { maxAttempts: 3, baseDelayMs: 1000 }
    )
      .then(() => ({ error: null }))
      .catch((err) => ({ error: err as Error }));

    if (uploadError) {
      return {
        success: false,
        data: null,
        error: `Failed to upload photo: ${uploadError.message}`,
      };
    }

    // Get file size from array buffer
    const fileSize = arrayBuffer.byteLength;

    // Upload thumbnail if provided
    let thumbnailPath: string | null = null;
    if (thumbnailFileUri) {
      const thumbFilename = `thumb_${filename}`;
      thumbnailPath = `photos/${assetId}/thumbnails/${thumbFilename}`;

      try {
        const thumbResponse = await fetch(thumbnailFileUri);
        const thumbArrayBuffer = await thumbResponse.arrayBuffer();
        const thumbBuffer = new Uint8Array(thumbArrayBuffer);

        const { error: thumbUploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.photos)
          .upload(thumbnailPath, thumbBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '31536000', // 1 year cache for thumbnails
            upsert: false,
          });

        if (thumbUploadError) {
          console.warn(`Failed to upload thumbnail: ${thumbUploadError.message}`);
          thumbnailPath = null; // Continue without thumbnail
        }
      } catch (thumbError) {
        console.warn('Failed to upload thumbnail:', thumbError);
        thumbnailPath = null; // Continue without thumbnail
      }
    }

    // Create database record
    const photoInput: CreatePhotoInput = {
      assetId,
      scanEventId: scanEventId ?? null,
      uploadedBy,
      photoType,
      storagePath,
      thumbnailPath,
      filename,
      fileSize,
      mimeType,
      width: width ?? null,
      height: height ?? null,
      locationDescription: locationDescription ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    };

    const parsed = CreatePhotoInputSchema.safeParse(photoInput);
    if (!parsed.success) {
      // Cleanup uploaded files on validation failure
      const pathsToRemove = [storagePath];
      if (thumbnailPath) pathsToRemove.push(thumbnailPath);
      try {
        await supabase.storage.from(STORAGE_BUCKETS.photos).remove(pathsToRemove);
      } catch (cleanupError) {
        console.error(
          '[photos] Failed to clean up orphaned storage files:',
          pathsToRemove,
          cleanupError
        );
      }
      return {
        success: false,
        data: null,
        error: parsed.error.errors[0]?.message ?? 'Invalid input',
      };
    }

    const dbData = mapPhotoToInsert(parsed.data as CreatePhotoInput);

    const { data, error: dbError } = await withRetry(
      async () => {
        const result = await supabase.from('photos').insert(dbData).select().single();
        if (result.error) throw result.error;
        return result;
      },
      { maxAttempts: 2, baseDelayMs: 1000 }
    )
      .then((result) => ({ data: result.data, error: null }))
      .catch((err) => ({ data: null, error: err as Error }));

    if (dbError) {
      // Cleanup uploaded files on database failure
      const pathsToRemove = [storagePath];
      if (thumbnailPath) pathsToRemove.push(thumbnailPath);
      try {
        await supabase.storage.from(STORAGE_BUCKETS.photos).remove(pathsToRemove);
      } catch (cleanupError) {
        console.error(
          '[photos] Failed to clean up orphaned storage files:',
          pathsToRemove,
          cleanupError
        );
      }
      return {
        success: false,
        data: null,
        error: `Failed to create photo record: ${dbError.message}`,
      };
    }

    return { success: true, data: mapRowToPhoto(data as PhotoRow), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload photo';
    return { success: false, data: null, error: message };
  }
}

// ── Shared interfaces for photo list queries ──

interface FreightAnalysisSummary {
  primary_category: string | null;
  confidence: number | null;
  hazard_count: number;
  max_severity: string | null;
  requires_acknowledgment: boolean;
  blocked_from_departure: boolean;
}

interface PhotoListRow {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  photo_type: string;
  created_at: string;
  freight_analysis: FreightAnalysisSummary | FreightAnalysisSummary[] | null;
}

/**
 * Get photos for an asset with analysis summary data.
 * Uses optimized query excluding raw_response JSONB.
 * Results ordered by created_at DESC with keyset pagination support.
 */
export async function getAssetPhotos(
  assetId: string,
  limit: number = 20,
  cursor?: { createdAt: string; id: string }
): Promise<ServiceResult<PhotoListItem[]>> {
  const supabase = getSupabaseClient();

  // Build query with specific columns (excluding raw_response)
  let query = supabase
    .from('photos')
    .select(
      `
      id,
      storage_path,
      thumbnail_path,
      photo_type,
      created_at,
      freight_analysis!left(
        primary_category,
        confidence,
        hazard_count,
        max_severity,
        requires_acknowledgment,
        blocked_from_departure
      )
    `
    )
    .eq('asset_id', assetId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  // Composite cursor keyset pagination — no extra DB round-trip
  if (cursor) {
    if (!isValidISOTimestamp(cursor.createdAt) || !isValidUUID(cursor.id)) {
      return { success: true, data: [], error: null };
    }
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
    );
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, data: null, error: `Failed to fetch photos: ${error.message}` };
  }

  const photos: PhotoListItem[] = (data || []).map((row: PhotoListRow) => {
    // Handle both single object and array (Supabase join quirk)
    const analysis = Array.isArray(row.freight_analysis)
      ? row.freight_analysis[0]
      : row.freight_analysis;

    return {
      id: row.id,
      storagePath: row.storage_path,
      thumbnailPath: row.thumbnail_path,
      photoType: safeParseEnum(PhotoTypeSchema, row.photo_type, 'freight'),
      createdAt: row.created_at,
      primaryCategory: analysis?.primary_category ?? null,
      confidence: analysis?.confidence ?? null,
      hazardCount: analysis?.hazard_count ?? 0,
      maxSeverity: safeParseEnum(HazardSeveritySchema, analysis?.max_severity, null),
      requiresAcknowledgment: analysis?.requires_acknowledgment ?? false,
      blockedFromDeparture: analysis?.blocked_from_departure ?? false,
    };
  });

  return { success: true, data: photos, error: null };
}

/**
 * Get photos linked to a scan event with analysis summary data.
 * Uses the same optimized query as getAssetPhotos (excluding raw_response JSONB).
 * No pagination — a scan event typically has at most 1-2 photos.
 */
export async function getPhotosByScanEventId(
  scanEventId: string
): Promise<ServiceResult<PhotoListItem[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('photos')
    .select(
      `
      id,
      storage_path,
      thumbnail_path,
      photo_type,
      created_at,
      freight_analysis!left(
        primary_category,
        confidence,
        hazard_count,
        max_severity,
        requires_acknowledgment,
        blocked_from_departure
      )
    `
    )
    .eq('scan_event_id', scanEventId)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, data: null, error: `Failed to fetch photos: ${error.message}` };
  }

  const photos: PhotoListItem[] = (data || []).map((row: PhotoListRow) => {
    const analysis = Array.isArray(row.freight_analysis)
      ? row.freight_analysis[0]
      : row.freight_analysis;

    return {
      id: row.id,
      storagePath: row.storage_path,
      thumbnailPath: row.thumbnail_path,
      photoType: safeParseEnum(PhotoTypeSchema, row.photo_type, 'freight'),
      createdAt: row.created_at,
      primaryCategory: analysis?.primary_category ?? null,
      confidence: analysis?.confidence ?? null,
      hazardCount: analysis?.hazard_count ?? 0,
      maxSeverity: safeParseEnum(HazardSeveritySchema, analysis?.max_severity, null),
      requiresAcknowledgment: analysis?.requires_acknowledgment ?? false,
      blockedFromDeparture: analysis?.blocked_from_departure ?? false,
    };
  });

  return { success: true, data: photos, error: null };
}

/**
 * Get a single photo by ID with full analysis data including hazard alerts.
 */
export async function getPhotoById(photoId: string): Promise<ServiceResult<PhotoWithAnalysis>> {
  const supabase = getSupabaseClient();

  // Fetch photo with freight analysis and hazard alerts in parallel
  const [photoResult, alertsResult] = await Promise.all([
    supabase
      .from('photos')
      .select(
        `
        *,
        freight_analysis!left(
          id,
          photo_id,
          asset_id,
          analyzed_by_user,
          primary_category,
          secondary_categories,
          description,
          confidence,
          estimated_weight_kg,
          load_distribution_score,
          restraint_count,
          hazard_count,
          max_severity,
          requires_acknowledgment,
          blocked_from_departure,
          model_version,
          processing_duration_ms,
          created_at,
          updated_at
        )
      `
      )
      .eq('id', photoId)
      .maybeSingle(),
    supabase
      .from('hazard_alerts')
      .select('*')
      .eq('photo_id', photoId)
      .order('severity', { ascending: true }),
  ]);

  if (photoResult.error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch photo: ${photoResult.error.message}`,
    };
  }

  if (!photoResult.data) {
    return { success: false, data: null, error: 'Photo not found' };
  }

  interface PhotoWithAnalysisRow extends PhotoRow {
    freight_analysis: (Omit<FreightAnalysisRow, 'raw_response'> & { raw_response?: never }) | null;
  }

  const validated = validateQueryResult(photoResult.data, PhotoWithAnalysisResponseSchema);
  const row = validated as unknown as PhotoWithAnalysisRow;
  const { freight_analysis, ...photoRow } = row;
  const photo = mapRowToPhoto(photoRow as PhotoRow);

  let hazardAlerts: HazardAlert[] = [];
  let freightAnalysis: FreightAnalysis | null = null;

  if (freight_analysis) {
    freightAnalysis = mapRowToFreightAnalysis({
      ...freight_analysis,
      raw_response: null,
    } as FreightAnalysisRow);

    if (!alertsResult.error && alertsResult.data) {
      hazardAlerts = (alertsResult.data as unknown as HazardAlertRow[]).map((alertRow) =>
        mapRowToHazardAlert(alertRow)
      );
    }
  }

  return {
    success: true,
    data: {
      ...photo,
      freightAnalysis,
      hazardAlerts,
    },
    error: null,
  };
}

/**
 * Delete a photo from storage and database.
 */
export async function deletePhoto(photoId: string): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  // Delete from database and retrieve storage paths in a single query
  // (cascades to freight_analysis and hazard_alerts via FK)
  const { data: photo, error: dbError } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId)
    .select('storage_path, thumbnail_path')
    .single();

  if (dbError) {
    if (dbError.code === 'PGRST116') {
      return { success: false, data: null, error: 'Photo not found' };
    }
    return { success: false, data: null, error: `Failed to delete photo: ${dbError.message}` };
  }

  // Delete from storage
  const pathsToDelete = [photo.storage_path];
  if (photo.thumbnail_path) {
    pathsToDelete.push(photo.thumbnail_path);
  }

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKETS.photos)
    .remove(pathsToDelete);

  if (storageError) {
    console.warn(`Failed to delete photo from storage: ${storageError.message}`);
    // DB record already deleted; storage cleanup is best-effort
  }

  return { success: true, data: undefined, error: null };
}

/**
 * Bulk delete photos from storage and database.
 * Uses batch operations (3 total queries) instead of 3N for individual deletes.
 */
export async function bulkDeletePhotos(
  photoIds: string[]
): Promise<ServiceResult<{ deleted: number; failed: string[] }>> {
  if (photoIds.length === 0) {
    return { success: true, data: { deleted: 0, failed: [] }, error: null };
  }

  const supabase = getSupabaseClient();

  try {
    // 1. Fetch all storage paths for the given IDs
    const { data: photos, error: fetchError } = await supabase
      .from('photos')
      .select('id, storage_path, thumbnail_path')
      .in('id', photoIds);

    if (fetchError) {
      return { success: false, data: null, error: `Failed to fetch photos: ${fetchError.message}` };
    }

    if (!photos || photos.length === 0) {
      return { success: true, data: { deleted: 0, failed: photoIds }, error: null };
    }

    // Collect all storage paths to delete
    const storagePaths: string[] = [];
    for (const photo of photos) {
      storagePaths.push(photo.storage_path);
      if (photo.thumbnail_path) {
        storagePaths.push(photo.thumbnail_path);
      }
    }

    // 2. Delete from database FIRST (cascades to freight_analysis and hazard_alerts via FK)
    // If this fails, we return early without touching storage — no orphaned references.
    const foundIds = photos.map((p) => p.id);
    const { error: dbError } = await supabase.from('photos').delete().in('id', foundIds);

    if (dbError) {
      return { success: false, data: null, error: `Failed to delete photos: ${dbError.message}` };
    }

    // 3. Best-effort storage cleanup (orphans are acceptable, can be cleaned later)
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKETS.photos)
        .remove(storagePaths);

      if (storageError) {
        console.warn(`Failed to delete photos from storage: ${storageError.message}`);
      }
    }

    // Track which IDs weren't found
    const foundIdSet = new Set(foundIds);
    const failed = photoIds.filter((id) => !foundIdSet.has(id));

    return {
      success: true,
      data: { deleted: foundIds.length, failed },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk delete photos';
    return { success: false, data: null, error: message };
  }
}

/**
 * Create a photo database record without uploading.
 * Useful when the file is uploaded separately (e.g., web direct upload).
 * Validates input with Zod and maps to database row format.
 */
export async function createPhotoRecord(input: CreatePhotoInput): Promise<ServiceResult<Photo>> {
  const parsed = CreatePhotoInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      data: null,
      error: parsed.error.errors[0]?.message ?? 'Invalid input',
    };
  }

  const supabase = getSupabaseClient();
  const dbData = mapPhotoToInsert(parsed.data as CreatePhotoInput);

  const { data, error } = await supabase.from('photos').insert(dbData).select().single();

  if (error) {
    return { success: false, data: null, error: `Failed to create photo record: ${error.message}` };
  }

  return { success: true, data: mapRowToPhoto(data as PhotoRow), error: null };
}

/**
 * Generate a signed URL for downloading a photo.
 * URLs are valid for 1 hour by default.
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<ServiceResult<string>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.photos)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    return { success: false, data: null, error: `Failed to generate signed URL: ${error.message}` };
  }

  return { success: true, data: data.signedUrl, error: null };
}

/**
 * Generate signed URLs for multiple photos in a single batch request.
 * Returns a map of { storagePath → signedUrl } for easy lookup.
 * URLs are valid for 1 hour by default.
 */
export async function getSignedUrls(
  storagePaths: string[],
  expiresIn: number = 3600
): Promise<ServiceResult<Record<string, string>>> {
  if (storagePaths.length === 0) {
    return { success: true, data: {}, error: null };
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.photos)
    .createSignedUrls(storagePaths, expiresIn);

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to generate signed URLs: ${error.message}`,
    };
  }

  const urlMap: Record<string, string> = {};
  for (const item of data) {
    if (item.signedUrl && item.path) {
      urlMap[item.path] = item.signedUrl;
    }
  }

  return { success: true, data: urlMap, error: null };
}

/**
 * Get public URL for a photo (if bucket is public).
 * Use this for thumbnails or when signed URLs aren't needed.
 */
export function getPublicUrl(storagePath: string): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(STORAGE_BUCKETS.photos).getPublicUrl(storagePath);
  return data.publicUrl;
}
