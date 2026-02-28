import { z } from 'zod';

// ============================================================================
// Asset Count Types
// ============================================================================
// Types for depot inventory count sessions with combination support.
// Uses discriminated unions to prevent invalid states.
// ============================================================================

// ── Session Status ──

export type AssetCountSessionStatus = 'in_progress' | 'completed' | 'cancelled';

// ── Discriminated Union for Asset Scans ──

/**
 * A standalone asset scan (not linked to any combination).
 */
export interface StandaloneScan {
  type: 'standalone';
  assetId: string;
  assetNumber: string;
  timestamp: number;
}

/**
 * An asset scan that is part of a combination (linked group).
 */
export interface CombinationScan {
  type: 'combination';
  assetId: string;
  assetNumber: string;
  timestamp: number;
  /** UUID grouping linked assets */
  combinationId: string;
  /** Position in the combination chain (1-based) */
  combinationPosition: number;
}

/**
 * Discriminated union for asset scans.
 * Use `scan.type` to narrow the type.
 */
export type AssetScan = StandaloneScan | CombinationScan;

// ── Combination Group ──

/**
 * A group of linked assets with optional photo and notes.
 * Stored in Record<string, CombinationGroup> for AsyncStorage serialization.
 */
export interface CombinationGroup {
  combinationId: string;
  /** Asset IDs in this combination (order matches combinationPosition) */
  assetIds: string[];
  /** Asset numbers for display */
  assetNumbers: string[];
  /** Optional notes describing the combination */
  notes: string | null;
  /** Local URI of captured photo (null until captured) */
  photoUri: string | null;
  /** Database photo ID after upload (null until uploaded) */
  photoId: string | null;
}

// ── Asset Count State ──

/**
 * Complete state for an asset count session.
 * Designed for AsyncStorage serialization (no Map, use Record).
 */
export interface AssetCountState {
  /** Whether a count session is currently active */
  isActive: boolean;
  /** Database session ID (null until created in DB) */
  sessionId: string | null;
  /** The depot being counted */
  depotId: string | null;
  /** Human-readable depot name */
  depotName: string | null;
  /** All confirmed scans in this session */
  scans: AssetScan[];
  /** Current pending scan awaiting confirmation */
  currentScan: AssetScan | null;
  /** Combination groups keyed by combinationId */
  combinations: Record<string, CombinationGroup>;
  /** Last scan that was standalone (candidate for linking) */
  lastUnlinkedScanIndex: number | null;
}

// ── Database Row Types ──

/**
 * Database row for asset_count_sessions table.
 */
export interface AssetCountSessionRow {
  id: string;
  depot_id: string;
  counted_by: string;
  started_at: string;
  completed_at: string | null;
  status: AssetCountSessionStatus;
  total_assets_counted: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database row for asset_count_items table.
 */
export interface AssetCountItemRow {
  id: string;
  session_id: string;
  asset_id: string;
  scanned_at: string;
  combination_id: string | null;
  combination_position: number | null;
}

/**
 * Database row for asset_count_combination_metadata table.
 */
export interface CombinationMetadataRow {
  id: string;
  session_id: string;
  combination_id: string;
  notes: string | null;
  created_at: string;
}

/**
 * Database row for asset_count_combination_photos table.
 */
export interface CombinationPhotoRow {
  id: string;
  session_id: string;
  combination_id: string;
  photo_id: string;
  created_at: string;
}

// ── Mapped Domain Types ──

/**
 * Asset count session domain type.
 */
export interface AssetCountSession {
  id: string;
  depotId: string;
  countedBy: string;
  startedAt: Date;
  completedAt: Date | null;
  status: AssetCountSessionStatus;
  totalAssetsCounted: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Asset count item domain type.
 */
export interface AssetCountItem {
  id: string;
  sessionId: string;
  assetId: string;
  scannedAt: Date;
  combinationId: string | null;
  combinationPosition: number | null;
}

/**
 * Combination metadata domain type.
 */
export interface CombinationMetadata {
  id: string;
  sessionId: string;
  combinationId: string;
  notes: string | null;
  createdAt: Date;
}

/**
 * Combination photo domain type.
 */
export interface CombinationPhoto {
  id: string;
  sessionId: string;
  combinationId: string;
  photoId: string;
  createdAt: Date;
}

// ── Input Types ──

export interface CreateAssetCountSessionInput {
  depotId: string;
  countedBy: string;
}

export interface CreateAssetCountItemInput {
  sessionId: string;
  assetId: string;
  combinationId?: string | null;
  combinationPosition?: number | null;
}

export interface CreateCombinationMetadataInput {
  sessionId: string;
  combinationId: string;
  notes: string | null;
}

export interface CreateCombinationPhotoInput {
  sessionId: string;
  combinationId: string;
  photoId: string;
}

// ── Zod Schemas for Runtime Validation ──

export const StandaloneScanSchema = z.object({
  type: z.literal('standalone'),
  assetId: z.string().uuid(),
  assetNumber: z.string().min(1),
  timestamp: z.number(),
});

export const CombinationScanSchema = z.object({
  type: z.literal('combination'),
  assetId: z.string().uuid(),
  assetNumber: z.string().min(1),
  timestamp: z.number(),
  combinationId: z.string().uuid(),
  combinationPosition: z.number().int().positive(),
});

export const AssetScanSchema = z.discriminatedUnion('type', [
  StandaloneScanSchema,
  CombinationScanSchema,
]);

export const CombinationGroupSchema = z.object({
  combinationId: z.string().uuid(),
  assetIds: z.array(z.string().uuid()),
  assetNumbers: z.array(z.string().min(1)),
  notes: z.string().nullable(),
  photoUri: z.string().nullable(),
  photoId: z.string().uuid().nullable(),
});

export const AssetCountStateSchema = z.object({
  isActive: z.boolean(),
  sessionId: z.string().uuid().nullable(),
  depotId: z.string().uuid().nullable(),
  depotName: z.string().nullable(),
  scans: z.array(AssetScanSchema),
  currentScan: AssetScanSchema.nullable(),
  combinations: z.record(z.string(), CombinationGroupSchema),
  lastUnlinkedScanIndex: z.number().int().nullable(),
});

// ── Type Guards ──

/**
 * Type guard to check if a scan is standalone.
 */
export function isStandaloneScan(scan: AssetScan): scan is StandaloneScan {
  return scan.type === 'standalone';
}

/**
 * Type guard to check if a scan is part of a combination.
 */
export function isCombinationScan(scan: AssetScan): scan is CombinationScan {
  return scan.type === 'combination';
}

/**
 * Validates and narrows an unknown value to AssetCountState.
 * Use when restoring from AsyncStorage.
 */
export function isValidAssetCountState(obj: unknown): obj is AssetCountState {
  const result = AssetCountStateSchema.safeParse(obj);
  return result.success;
}

// ── Row Mappers ──

export function mapRowToAssetCountSession(row: AssetCountSessionRow): AssetCountSession {
  return {
    id: row.id,
    depotId: row.depot_id,
    countedBy: row.counted_by,
    startedAt: new Date(row.started_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    status: row.status,
    totalAssetsCounted: row.total_assets_counted,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function mapRowToAssetCountItem(row: AssetCountItemRow): AssetCountItem {
  return {
    id: row.id,
    sessionId: row.session_id,
    assetId: row.asset_id,
    scannedAt: new Date(row.scanned_at),
    combinationId: row.combination_id,
    combinationPosition: row.combination_position,
  };
}

export function mapRowToCombinationMetadata(row: CombinationMetadataRow): CombinationMetadata {
  return {
    id: row.id,
    sessionId: row.session_id,
    combinationId: row.combination_id,
    notes: row.notes,
    createdAt: new Date(row.created_at),
  };
}

export function mapRowToCombinationPhoto(row: CombinationPhotoRow): CombinationPhoto {
  return {
    id: row.id,
    sessionId: row.session_id,
    combinationId: row.combination_id,
    photoId: row.photo_id,
    createdAt: new Date(row.created_at),
  };
}
