import { z } from 'zod';
import {
  HazardSeveritySchema,
  HazardStatusSchema,
  ReviewOutcomeSchema,
} from '../enums/HazardEnums';
import type { HazardSeverity, HazardStatus, ReviewOutcome } from '../enums/HazardEnums';
import type { Json } from '../database.types';
import { safeParseEnum } from '../../utils/safeParseEnum';

/**
 * HazardAlert — camelCase application interface
 */
export interface HazardAlert {
  id: string;
  freightAnalysisId: string;
  photoId: string;
  assetId: string | null;
  scanEventId: string | null;
  hazardRuleId: string | null;
  hazardType: string;
  severity: HazardSeverity;
  confidenceScore: number;
  description: string;
  evidencePoints: string[];
  recommendedActions: string[];
  locationInImage: string | null;
  boundingBox: Json | null;
  status: HazardStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  acknowledgmentType: string | null;
  managerReviewBy: string | null;
  managerReviewAt: string | null;
  reviewOutcome: ReviewOutcome | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * HazardAlertRow — snake_case database row type
 */
export interface HazardAlertRow {
  id: string;
  freight_analysis_id: string;
  photo_id: string;
  asset_id: string | null;
  scan_event_id: string | null;
  hazard_rule_id: string | null;
  hazard_type: string;
  severity: HazardSeverity;
  confidence_score: number;
  description: string;
  evidence_points: string[] | null;
  recommended_actions: string[] | null;
  location_in_image: string | null;
  bounding_box: Json | null;
  status: HazardStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  acknowledgment_type: string | null;
  manager_review_by: string | null;
  manager_review_at: string | null;
  review_outcome: ReviewOutcome | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for acknowledging/reviewing a hazard alert
 */
export interface UpdateHazardAlertInput {
  status?: HazardStatus;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  acknowledgmentType?: string | null;
  managerReviewBy?: string | null;
  managerReviewAt?: string | null;
  reviewOutcome?: ReviewOutcome | null;
  reviewNotes?: string | null;
}

// ── Zod schemas ──

export const UpdateHazardAlertInputSchema = z.object({
  status: HazardStatusSchema.optional(),
  acknowledgedBy: z.string().uuid().nullable().optional(),
  acknowledgedAt: z.string().nullable().optional(),
  acknowledgmentType: z.string().max(50).nullable().optional(),
  managerReviewBy: z.string().uuid().nullable().optional(),
  managerReviewAt: z.string().nullable().optional(),
  reviewOutcome: ReviewOutcomeSchema.nullable().optional(),
  reviewNotes: z.string().nullable().optional(),
});

// ── Mappers ──

export function mapRowToHazardAlert(row: HazardAlertRow): HazardAlert {
  return {
    id: row.id,
    freightAnalysisId: row.freight_analysis_id,
    photoId: row.photo_id,
    assetId: row.asset_id,
    scanEventId: row.scan_event_id,
    hazardRuleId: row.hazard_rule_id,
    hazardType: row.hazard_type,
    severity: safeParseEnum(HazardSeveritySchema, row.severity, 'medium'),
    confidenceScore: row.confidence_score,
    description: row.description,
    evidencePoints: row.evidence_points ?? [],
    recommendedActions: row.recommended_actions ?? [],
    locationInImage: row.location_in_image,
    boundingBox: row.bounding_box,
    status: safeParseEnum(HazardStatusSchema, row.status, 'active'),
    acknowledgedBy: row.acknowledged_by,
    acknowledgedAt: row.acknowledged_at,
    acknowledgmentType: row.acknowledgment_type,
    managerReviewBy: row.manager_review_by,
    managerReviewAt: row.manager_review_at,
    reviewOutcome: row.review_outcome == null ? null : safeParseEnum(ReviewOutcomeSchema, row.review_outcome, null),
    reviewNotes: row.review_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type HazardAlertUpdateRow = Partial<Omit<HazardAlertRow, 'id' | 'created_at'>>;

export function mapHazardAlertToUpdate(
  input: UpdateHazardAlertInput
): HazardAlertUpdateRow {
  const updates: HazardAlertUpdateRow = {};

  if (input.status !== undefined) updates['status'] = input.status;
  if (input.acknowledgedBy !== undefined) updates['acknowledged_by'] = input.acknowledgedBy;
  if (input.acknowledgedAt !== undefined) updates['acknowledged_at'] = input.acknowledgedAt;
  if (input.acknowledgmentType !== undefined) updates['acknowledgment_type'] = input.acknowledgmentType;
  if (input.managerReviewBy !== undefined) updates['manager_review_by'] = input.managerReviewBy;
  if (input.managerReviewAt !== undefined) updates['manager_review_at'] = input.managerReviewAt;
  if (input.reviewOutcome !== undefined) updates['review_outcome'] = input.reviewOutcome;
  if (input.reviewNotes !== undefined) updates['review_notes'] = input.reviewNotes;

  return updates;
}
