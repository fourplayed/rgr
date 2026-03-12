import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';
import type { HazardAlert } from '../../types/entities';
import type { HazardAlertRow } from '../../types/entities/hazardAlert';
import type { HazardSeverity, ReviewOutcome } from '../../types/enums/HazardEnums';
import { mapRowToHazardAlert } from '../../types/entities/hazardAlert';

// ── Interfaces ──

export interface HazardAlertForReview extends HazardAlert {
  freightAnalysis: {
    id: string;
    photoId: string;
    createdAt: string;
  } | undefined;
  photo: {
    id: string;
    storagePath: string;
    thumbnailPath: string;
  } | undefined;
  asset: {
    id: string;
    assetNumber: string;
  } | undefined;
}

export interface HazardReviewParams {
  page?: number;
  pageSize?: number;
  status?: 'pending' | 'reviewed' | 'all';
  severities?: HazardSeverity[] | undefined;
  dateStart?: string;
}

export interface HazardReviewStats {
  pendingReviews: number;
  aiAccuracy: number;
  falsePositiveRate: number;
  totalPhotosAnalyzed: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface AnalysisHistoryParams {
  limit?: number;
  freightCategory?: string | undefined;
  dateRange?: 'all' | 'today' | 'week' | 'month';
}

export interface AnalysisHistoryItem {
  id: string;
  photoId: string;
  storagePath: string;
  freightCategory: string;
  freightDescription: string;
  confidence: number;
  hazardCount: number;
  wasReviewed: boolean;
  wasAccurate: boolean | null;
  analyzedAt: string;
  assetNumber: string | null;
}

export interface SubmitAnalysisFeedbackInput {
  analysisId: string;
  reviewerId: string;
  hazardFeedback: Array<{
    hazardType: string;
    wasAccurate: boolean;
  }>;
  reviewNotes?: string | null;
}

// ── Join Row Types ──

interface HazardAlertJoinRow extends HazardAlertRow {
  freight_analysis?: { id: string; photo_id: string; created_at: string } | null;
  photos?: { id: string; storage_path: string; thumbnail_path: string } | null;
  assets?: { id: string; asset_number: string } | null;
}

interface AnalysisHistoryRow {
  id: string;
  photo_id: string;
  primary_category: string | null;
  description: string | null;
  confidence: number | null;
  created_at: string;
  photos: {
    id: string;
    storage_path: string;
    asset_id: string | null;
    assets: { asset_number: string } | null;
  };
  hazard_alerts: Array<{
    id: string;
    review_outcome: string | null;
    manager_review_at: string | null;
  }>;
}

// ── Hazard Alerts for Review ──

/**
 * Fetch hazard alerts with joined photo, asset, and analysis data for review.
 *
 * NOTE: Uses 0-indexed `page` (matching its web consumer). Other list endpoints
 * in this codebase use 1-indexed pagination — be aware of this difference.
 */
export async function getHazardAlertsForReview(
  params: HazardReviewParams = {}
): Promise<ServiceResult<HazardAlertForReview[]>> {
  const { page = 0, pageSize = 20, status = 'pending', severities, dateStart } = params;
  const supabase = getSupabaseClient();

  let query = supabase
    .from('hazard_alerts')
    .select(
      `
      *,
      freight_analysis:freight_analysis_id (
        id,
        photo_id,
        created_at
      ),
      photos:photo_id (
        id,
        storage_path,
        thumbnail_path
      ),
      assets:asset_id (
        id,
        asset_number
      )
    `
    )
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  // Apply status filter
  if (status === 'pending') {
    query = query.eq('status', 'active');
  } else if (status === 'reviewed') {
    query = query.in('status', ['acknowledged', 'resolved', 'dismissed']);
  }

  // Apply severity filter
  if (severities && severities.length > 0) {
    query = query.in('severity', severities);
  }

  // Apply date range filter
  if (dateStart) {
    query = query.gte('created_at', dateStart);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, data: null, error: `Failed to fetch hazard alerts: ${error.message}` };
  }

  const alerts = ((data as HazardAlertJoinRow[]) || []).map((row) => {
    const { freight_analysis, photos, assets, ...alertRow } = row;
    const alert = mapRowToHazardAlert(alertRow as HazardAlertRow);

    return {
      ...alert,
      freightAnalysis: freight_analysis
        ? {
            id: freight_analysis.id,
            photoId: freight_analysis.photo_id,
            createdAt: freight_analysis.created_at,
          }
        : undefined,
      photo: photos
        ? {
            id: photos.id,
            storagePath: photos.storage_path,
            thumbnailPath: photos.thumbnail_path,
          }
        : undefined,
      asset: assets
        ? {
            id: assets.id,
            assetNumber: assets.asset_number,
          }
        : undefined,
    } as HazardAlertForReview;
  });

  return { success: true, data: alerts, error: null };
}

// ── Hazard Review Stats ──

/**
 * Fetch hazard review statistics via RPC.
 */
export async function getHazardReviewStats(): Promise<ServiceResult<HazardReviewStats>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_hazard_review_stats');

  if (error) {
    return { success: false, data: null, error: `Failed to fetch review stats: ${error.message}` };
  }

  if (data == null || typeof data !== 'object') {
    return { success: false, data: null, error: 'Invalid hazard review stats response' };
  }

  const rpc = data as {
    total_photos_analyzed: number;
    pending_reviews: number;
    ai_accuracy: number;
    false_positive_rate: number;
    severity_breakdown: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };

  return {
    success: true,
    data: {
      pendingReviews: rpc.pending_reviews,
      aiAccuracy: rpc.ai_accuracy,
      falsePositiveRate: rpc.false_positive_rate,
      totalPhotosAnalyzed: rpc.total_photos_analyzed,
      severityBreakdown: rpc.severity_breakdown,
    },
    error: null,
  };
}

// ── Analysis History ──

/**
 * Fetch freight analysis history with photo and hazard data.
 */
export async function getAnalysisHistory(
  params: AnalysisHistoryParams = {}
): Promise<ServiceResult<AnalysisHistoryItem[]>> {
  const { limit = 50, freightCategory, dateRange = 'all' } = params;
  const supabase = getSupabaseClient();

  let query = supabase
    .from('freight_analysis')
    .select(
      `
      id,
      photo_id,
      primary_category,
      description,
      confidence,
      created_at,
      photos!inner (
        id,
        storage_path,
        asset_id,
        assets (
          asset_number
        )
      ),
      hazard_alerts (
        id,
        review_outcome,
        manager_review_at
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  // Apply freight category filter
  if (freightCategory) {
    query = query.eq('primary_category', freightCategory);
  }

  // Apply date range filter
  if (dateRange !== 'all') {
    let startDate: Date;
    switch (dateRange) {
      case 'today':
        startDate = new Date(new Date().setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(Date.now() - 7 * 86400000);
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 86400000);
        break;
      default:
        startDate = new Date(0);
    }
    query = query.gte('created_at', startDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch analysis history: ${error.message}`,
    };
  }

  const items = ((data as AnalysisHistoryRow[]) || []).map((item) => {
    const photo = item.photos;
    const hazards = item.hazard_alerts || [];
    const hasReview = hazards.some((h) => h.manager_review_at !== null);
    const reviewedHazards = hazards.filter((h) => h.review_outcome !== null);
    const accurateCount = reviewedHazards.filter((h) => h.review_outcome === 'confirmed').length;

    return {
      id: item.id,
      photoId: photo?.id || '',
      storagePath: photo?.storage_path || '',
      freightCategory: formatCategory(item.primary_category),
      freightDescription: item.description || '',
      confidence: Math.round((item.confidence || 0) * 100),
      hazardCount: hazards.length,
      wasReviewed: hasReview,
      wasAccurate: reviewedHazards.length > 0 ? accurateCount === reviewedHazards.length : null,
      analyzedAt: item.created_at,
      assetNumber: photo?.assets?.asset_number || null,
    };
  });

  return { success: true, data: items, error: null };
}

// ── Submit Analysis Feedback ──

/**
 * Submit feedback on hazard detection accuracy via a single RPC call.
 * Replaces N sequential UPDATEs with an atomic batch operation.
 * Hazard type normalization is handled server-side by the RPC.
 */
export async function submitAnalysisFeedback(
  input: SubmitAnalysisFeedbackInput
): Promise<ServiceResult<{ updatedCount: number }>> {
  if (input.hazardFeedback.length === 0) {
    return { success: true, data: { updatedCount: 0 }, error: null };
  }

  const supabase = getSupabaseClient();

  const hazardTypes = input.hazardFeedback.map((fb) => fb.hazardType);
  const outcomes: ReviewOutcome[] = input.hazardFeedback.map((fb) =>
    fb.wasAccurate ? 'confirmed' : 'false_positive'
  );

  const { data, error } = await supabase.rpc('submit_hazard_feedback', {
    p_analysis_id: input.analysisId,
    p_reviewer_id: input.reviewerId,
    p_hazard_types: hazardTypes,
    p_outcomes: outcomes,
    // NOTE: ternary form required for exactOptionalPropertyTypes
    ...(input.reviewNotes ? { p_review_notes: input.reviewNotes } : {}),
  });

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to submit hazard feedback: ${error.message}`,
    };
  }

  return { success: true, data: { updatedCount: data as number }, error: null };
}

// ── Helpers ──

function formatCategory(category: string | null): string {
  if (!category) return 'Unknown';
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
