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
  is_analyzed: boolean;
  created_at: string;
}

// ── Mapper ──

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
    isAnalyzed: row.is_analyzed,
    createdAt: row.created_at,
  };
}
