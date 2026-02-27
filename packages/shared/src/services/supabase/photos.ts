import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';
import type {
  Photo,
  PhotoRow,
  CreatePhotoInput,
  FreightAnalysis,
  HazardAlert,
} from '../../types/entities';
import type { FreightAnalysisRow } from '../../types/entities/freightAnalysis';
import type { HazardAlertRow } from '../../types/entities/hazardAlert';
import {
  mapRowToPhoto,
  mapPhotoToInsert,
  CreatePhotoInputSchema,
} from '../../types/entities/photo';
import { mapRowToFreightAnalysis } from '../../types/entities/freightAnalysis';
import { mapRowToHazardAlert } from '../../types/entities/hazardAlert';
import { MAX_PHOTO_SIZE_BYTES } from '../../utils/constants';

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
  photoType: string;
  createdAt: string;
  // Analysis summary (excluding raw_response)
  primaryCategory: string | null;
  confidence: number | null;
  hazardCount: number;
  maxSeverity: string | null;
  requiresAcknowledgment: boolean;
  blockedFromDeparture: boolean;
}

export interface UploadPhotoOptions {
  assetId: string;
  scanEventId?: string | null;
  uploadedBy: string;
  photoType: string;
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
export async function uploadPhoto(
  options: UploadPhotoOptions
): Promise<ServiceResult<Photo>> {
  const { assetId, scanEventId, uploadedBy, photoType, fileUri, mimeType = 'image/jpeg', locationDescription, latitude, longitude, width, height, thumbnailFileUri } = options;

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
      return { success: false, data: null, error: `Photo exceeds maximum size of ${MAX_PHOTO_SIZE_BYTES / (1024 * 1024)}MB` };
    }

    // Convert to Uint8Array for Supabase upload
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('photos-compressed')
      .upload(storagePath, uint8Array, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return { success: false, data: null, error: `Failed to upload photo: ${uploadError.message}` };
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
          .from('photos-compressed')
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
      await supabase.storage.from('photos-compressed').remove(pathsToRemove);
      return { success: false, data: null, error: parsed.error.errors[0]?.message ?? 'Invalid input' };
    }

    const dbData = mapPhotoToInsert(parsed.data as CreatePhotoInput);

    const { data, error: dbError } = await supabase
      .from('photos')
      .insert(dbData)
      .select()
      .single();

    if (dbError) {
      // Cleanup uploaded files on database failure
      const pathsToRemove = [storagePath];
      if (thumbnailPath) pathsToRemove.push(thumbnailPath);
      await supabase.storage.from('photos-compressed').remove(pathsToRemove);
      return { success: false, data: null, error: `Failed to create photo record: ${dbError.message}` };
    }

    return { success: true, data: mapRowToPhoto(data as PhotoRow), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload photo';
    return { success: false, data: null, error: message };
  }
}

/**
 * Get photos for an asset with analysis summary data.
 * Uses optimized query excluding raw_response JSONB.
 * Results ordered by created_at DESC with keyset pagination support.
 */
export async function getAssetPhotos(
  assetId: string,
  limit: number = 20,
  beforeId?: string
): Promise<ServiceResult<PhotoListItem[]>> {
  const supabase = getSupabaseClient();

  // Build query with specific columns (excluding raw_response)
  let query = supabase
    .from('photos')
    .select(`
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
    `)
    .eq('asset_id', assetId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  // Keyset pagination: get photos created before the specified ID
  if (beforeId) {
    // Get the created_at of the beforeId to use as cursor
    const { data: cursorPhoto } = await supabase
      .from('photos')
      .select('created_at')
      .eq('id', beforeId)
      .single();

    if (cursorPhoto) {
      query = query.lt('created_at', cursorPhoto.created_at);
    }
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, data: null, error: `Failed to fetch photos: ${error.message}` };
  }

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
    // Supabase returns single joined row as object, not array
    freight_analysis: FreightAnalysisSummary | FreightAnalysisSummary[] | null;
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
      photoType: row.photo_type,
      createdAt: row.created_at,
      primaryCategory: analysis?.primary_category ?? null,
      confidence: analysis?.confidence ?? null,
      hazardCount: analysis?.hazard_count ?? 0,
      maxSeverity: analysis?.max_severity ?? null,
      requiresAcknowledgment: analysis?.requires_acknowledgment ?? false,
      blockedFromDeparture: analysis?.blocked_from_departure ?? false,
    };
  });

  return { success: true, data: photos, error: null };
}

/**
 * Get a single photo by ID with full analysis data including hazard alerts.
 */
export async function getPhotoById(
  photoId: string
): Promise<ServiceResult<PhotoWithAnalysis>> {
  const supabase = getSupabaseClient();

  // Get photo with freight analysis (excluding raw_response for performance)
  const { data: photoData, error: photoError } = await supabase
    .from('photos')
    .select(`
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
    `)
    .eq('id', photoId)
    .maybeSingle();

  if (photoError) {
    return { success: false, data: null, error: `Failed to fetch photo: ${photoError.message}` };
  }

  if (!photoData) {
    return { success: false, data: null, error: 'Photo not found' };
  }

  interface PhotoWithAnalysisRow extends PhotoRow {
    freight_analysis: Omit<FreightAnalysisRow, 'raw_response'> & { raw_response?: never } | null;
  }

  const row = photoData as unknown as PhotoWithAnalysisRow;
  const { freight_analysis, ...photoRow } = row;
  const photo = mapRowToPhoto(photoRow as PhotoRow);

  // Get hazard alerts if we have a freight analysis
  let hazardAlerts: HazardAlert[] = [];
  let freightAnalysis: FreightAnalysis | null = null;

  if (freight_analysis) {
    // Map freight analysis (add null raw_response since we excluded it)
    freightAnalysis = mapRowToFreightAnalysis({
      ...freight_analysis,
      raw_response: null,
    } as FreightAnalysisRow);

    // Fetch hazard alerts for this photo
    const { data: alertsData, error: alertsError } = await supabase
      .from('hazard_alerts')
      .select('*')
      .eq('photo_id', photoId)
      .order('severity', { ascending: true }); // critical first

    if (!alertsError && alertsData) {
      hazardAlerts = alertsData.map((alertRow: HazardAlertRow) => mapRowToHazardAlert(alertRow));
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
export async function deletePhoto(
  photoId: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  // First get the photo to find storage path
  const { data: photo, error: fetchError } = await supabase
    .from('photos')
    .select('storage_path, thumbnail_path')
    .eq('id', photoId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return { success: false, data: null, error: 'Photo not found' };
    }
    return { success: false, data: null, error: `Failed to fetch photo: ${fetchError.message}` };
  }

  // Delete from storage
  const pathsToDelete = [photo.storage_path];
  if (photo.thumbnail_path) {
    pathsToDelete.push(photo.thumbnail_path);
  }

  const { error: storageError } = await supabase.storage
    .from('photos-compressed')
    .remove(pathsToDelete);

  if (storageError) {
    console.warn(`Failed to delete photo from storage: ${storageError.message}`);
    // Continue with database deletion even if storage fails
  }

  // Delete from database (cascades to freight_analysis and hazard_alerts via FK)
  const { error: dbError } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId);

  if (dbError) {
    return { success: false, data: null, error: `Failed to delete photo: ${dbError.message}` };
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

    // 2. Batch remove from storage
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('photos-compressed')
        .remove(storagePaths);

      if (storageError) {
        console.warn(`Failed to delete photos from storage: ${storageError.message}`);
        // Continue with database deletion even if storage fails
      }
    }

    // 3. Batch delete from database (cascades to freight_analysis and hazard_alerts via FK)
    const foundIds = photos.map((p) => p.id);
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .in('id', foundIds);

    if (dbError) {
      return { success: false, data: null, error: `Failed to delete photos: ${dbError.message}` };
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
 * Generate a signed URL for downloading a photo.
 * URLs are valid for 1 hour by default.
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<ServiceResult<string>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from('photos-compressed')
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    return { success: false, data: null, error: `Failed to generate signed URL: ${error.message}` };
  }

  return { success: true, data: data.signedUrl, error: null };
}

/**
 * Get public URL for a photo (if bucket is public).
 * Use this for thumbnails or when signed URLs aren't needed.
 */
export function getPublicUrl(storagePath: string): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from('photos-compressed').getPublicUrl(storagePath);
  return data.publicUrl;
}
