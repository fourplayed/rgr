import { HazardSeveritySchema } from '../enums/HazardEnums';
import type { HazardSeverity } from '../enums/HazardEnums';

/**
 * FreightAnalysis — camelCase application interface
 */
export interface FreightAnalysis {
  id: string;
  photoId: string;
  assetId: string | null;
  analyzedByUser: string | null;
  primaryCategory: string | null;
  secondaryCategories: string[] | null;
  description: string | null;
  confidence: number | null;
  estimatedWeightKg: number | null;
  loadDistributionScore: number | null;
  restraintCount: number | null;
  hazardCount: number;
  maxSeverity: HazardSeverity | null;
  requiresAcknowledgment: boolean;
  blockedFromDeparture: boolean;
  rawResponse: Record<string, unknown> | null;
  modelVersion: string | null;
  processingDurationMs: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * FreightAnalysisRow — snake_case database row type
 */
export interface FreightAnalysisRow {
  id: string;
  photo_id: string;
  asset_id: string | null;
  analyzed_by_user: string | null;
  primary_category: string | null;
  secondary_categories: string[] | null;
  description: string | null;
  confidence: number | null;
  estimated_weight_kg: number | null;
  load_distribution_score: number | null;
  restraint_count: number | null;
  hazard_count: number;
  max_severity: string | null;
  requires_acknowledgment: boolean;
  blocked_from_departure: boolean;
  raw_response: Record<string, unknown> | null;
  model_version: string | null;
  processing_duration_ms: number | null;
  created_at: string;
  updated_at: string;
}

// ── Mapper ──

export function mapRowToFreightAnalysis(
  row: FreightAnalysisRow
): FreightAnalysis {
  return {
    id: row.id,
    photoId: row.photo_id,
    assetId: row.asset_id,
    analyzedByUser: row.analyzed_by_user,
    primaryCategory: row.primary_category,
    secondaryCategories: row.secondary_categories,
    description: row.description,
    confidence: row.confidence,
    estimatedWeightKg: row.estimated_weight_kg,
    loadDistributionScore: row.load_distribution_score,
    restraintCount: row.restraint_count,
    hazardCount: row.hazard_count,
    maxSeverity: row.max_severity == null ? null : HazardSeveritySchema.parse(row.max_severity),
    requiresAcknowledgment: row.requires_acknowledgment,
    blockedFromDeparture: row.blocked_from_departure,
    rawResponse: row.raw_response,
    modelVersion: row.model_version,
    processingDurationMs: row.processing_duration_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
