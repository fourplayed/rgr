import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';
import type { FleetAnalysis, UserActionSummary } from '../../types/entities/fleetAnalysis';

// ── Zod Schemas ──

const UserActionSummaryRowSchema = z.object({
  scans_performed: z.number(),
  defects_reported: z.number(),
  maintenance_reported: z.number(),
  maintenance_completed: z.number(),
});

// ── Fleet Analysis ──

/**
 * Fetch the most recent successful fleet analysis.
 */
interface FleetAnalysisRow {
  id: string;
  analysis_date: string;
  content: string;
  input_data: Record<string, unknown>;
  status: string;
  created_at: string;
}

export async function getLatestFleetAnalysis(): Promise<ServiceResult<FleetAnalysis | null>> {
  const supabase = getSupabaseClient();

  // fleet_analysis table is added by migration 20260316000000 —
  // cast to unparameterized SupabaseClient until database.types.ts is regenerated.
  const { data, error } = await (supabase as unknown as SupabaseClient)
    .from('fleet_analysis')
    .select('id, analysis_date, content, input_data, status, created_at')
    .eq('status', 'success')
    .order('analysis_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch fleet analysis: ${(error as { message: string }).message}`,
    };
  }

  if (!data) {
    return { success: true, data: null, error: null };
  }

  const row = data as FleetAnalysisRow;

  return {
    success: true,
    data: {
      id: row.id,
      analysisDate: row.analysis_date,
      content: row.content,
      inputData: row.input_data ?? {},
      status: row.status as 'success' | 'failed',
      createdAt: row.created_at,
    },
    error: null,
  };
}

// ── User Action Summary ──

/**
 * Fetch the current user's 24h activity summary via RPC.
 */
export async function getUserActionSummary(
  userId: string
): Promise<ServiceResult<UserActionSummary>> {
  const supabase = getSupabaseClient();

  // RPC added by migration 20260316000000 — cast until types regenerated.
  const { data, error } = await (supabase as unknown as SupabaseClient).rpc(
    'get_user_action_summary',
    {
      p_user_id: userId,
    }
  );

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch user action summary: ${(error as { message: string }).message}`,
    };
  }

  // RPC returns null if auth.uid() != p_user_id (security definer check)
  if (!data) {
    return {
      success: true,
      data: {
        scansPerformed: 0,
        defectsReported: 0,
        maintenanceReported: 0,
        maintenanceCompleted: 0,
      },
      error: null,
    };
  }

  const parsed = UserActionSummaryRowSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      data: null,
      error: 'Unexpected RPC response shape for get_user_action_summary',
    };
  }

  return {
    success: true,
    data: {
      scansPerformed: parsed.data.scans_performed,
      defectsReported: parsed.data.defects_reported,
      maintenanceReported: parsed.data.maintenance_reported,
      maintenanceCompleted: parsed.data.maintenance_completed,
    },
    error: null,
  };
}
