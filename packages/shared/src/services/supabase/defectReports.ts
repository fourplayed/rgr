import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';
import type {
  DefectReport,
  DefectReportWithNames,
  CreateDefectReportInput,
  UpdateDefectReportInput,
  DefectReportRow,
  DefectReportListItem,
} from '../../types/entities';
import type { DefectStatus } from '../../types/enums';
import type { MaintenancePriority, MaintenanceStatus } from '../../types/enums';
import {
  mapRowToDefectReport,
  mapDefectReportToInsert,
  mapDefectReportToUpdate,
  CreateDefectReportInputSchema,
  UpdateDefectReportInputSchema,
} from '../../types/entities/defectReport';

// ── Types ──

export interface ListDefectReportsParams {
  status?: DefectStatus[];
  assetId?: string;
  limit?: number;
  /** Composite cursor for keyset pagination — pass both values from the last item */
  cursor?: { createdAt: string; id: string };
}

export interface DefectReportStats {
  total: number;
  reported: number;
  accepted: number;
  resolved: number;
  dismissed: number;
}

// ── Status Transition Validation ──

const VALID_DEFECT_TRANSITIONS: Record<DefectStatus, DefectStatus[]> = {
  reported: ['accepted', 'dismissed'],
  accepted: ['resolved', 'dismissed'],
  resolved: [],
  dismissed: [],
};

function isValidDefectTransition(from: DefectStatus, to: DefectStatus): boolean {
  return VALID_DEFECT_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── List Defect Reports ──

export async function listDefectReports(
  params: ListDefectReportsParams = {}
): Promise<ServiceResult<{ data: DefectReportListItem[]; hasMore: boolean }>> {
  const { status, assetId, limit = 20, cursor } = params;

  const supabase = getSupabaseClient();

  // Fetch limit + 1 to detect if more pages exist
  let query = supabase
    .from('defect_reports')
    .select(`
      id, asset_id, title, description, status, maintenance_record_id, created_at,
      reporter:reported_by(full_name),
      asset:asset_id(asset_number, category)
    `)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  if (assetId) {
    query = query.eq('asset_id', assetId);
  }

  // Composite cursor keyset pagination — no extra lookup query needed.
  // Handles ties in created_at by using id as a tiebreaker.
  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
    );
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, data: null, error: `Failed to list defect reports: ${error.message}` };
  }

  interface DefectListRow {
    id: string;
    asset_id: string;
    title: string;
    description: string | null;
    status: DefectStatus;
    maintenance_record_id: string | null;
    created_at: string;
    reporter: { full_name: string } | null;
    asset: { asset_number: string; category: string } | null;
  }

  const rows = ((data || []) as unknown as DefectListRow[]);
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const items: DefectReportListItem[] = pageRows.map((row) => ({
    id: row.id,
    assetId: row.asset_id,
    title: row.title,
    description: row.description,
    status: row.status,
    maintenanceRecordId: row.maintenance_record_id,
    createdAt: row.created_at,
    reporterName: row.reporter?.full_name ?? null,
    assetNumber: row.asset?.asset_number ?? null,
    assetCategory: row.asset?.category ?? null,
  }));

  return { success: true, data: { data: items, hasMore }, error: null };
}

// ── Get Single Defect Report ──

export async function getDefectReportById(
  id: string
): Promise<ServiceResult<DefectReportWithNames>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('defect_reports')
    .select(`
      *,
      reporter:reported_by(full_name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return { success: false, data: null, error: `Failed to fetch defect report: ${error.message}` };
  }

  if (!data) {
    return { success: false, data: null, error: 'Defect report not found' };
  }

  const { reporter, ...defectRow } = data as DefectReportRow & { reporter: { full_name: string } | null };
  const record = mapRowToDefectReport(defectRow as DefectReportRow);

  return {
    success: true,
    data: {
      ...record,
      reporterName: reporter?.full_name ?? null,
    },
    error: null,
  };
}

// ── Create Defect Report ──

export async function createDefectReport(
  input: CreateDefectReportInput
): Promise<ServiceResult<DefectReport>> {
  const parsed = CreateDefectReportInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, data: null, error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  const supabase = getSupabaseClient();
  const dbData = mapDefectReportToInsert(parsed.data as CreateDefectReportInput);

  const { data, error } = await supabase
    .from('defect_reports')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    if (error.code === '23503') {
      return { success: false, data: null, error: 'Asset or user not found' };
    }
    return { success: false, data: null, error: `Failed to create defect report: ${error.message}` };
  }

  return { success: true, data: mapRowToDefectReport(data as DefectReportRow), error: null };
}

// ── Update Defect Report Status ──

export async function updateDefectReportStatus(
  id: string,
  newStatus: DefectStatus,
  extras?: { maintenanceRecordId?: string; dismissedReason?: string }
): Promise<ServiceResult<DefectReport>> {
  const supabase = getSupabaseClient();

  const { data: current, error: fetchError } = await supabase
    .from('defect_reports')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return { success: false, data: null, error: 'Defect report not found' };
  }

  const currentStatus = current.status as DefectStatus;

  if (!isValidDefectTransition(currentStatus, newStatus)) {
    return {
      success: false,
      data: null,
      error: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }

  const updates: Record<string, unknown> = { status: newStatus };

  if (newStatus === 'accepted') {
    updates['accepted_at'] = new Date().toISOString();
    if (extras?.maintenanceRecordId) {
      updates['maintenance_record_id'] = extras.maintenanceRecordId;
    }
  }

  if (newStatus === 'resolved') {
    updates['resolved_at'] = new Date().toISOString();
  }

  if (newStatus === 'dismissed') {
    updates['dismissed_at'] = new Date().toISOString();
    if (extras?.dismissedReason) {
      updates['dismissed_reason'] = extras.dismissedReason;
    }
  }

  const { data, error } = await supabase
    .from('defect_reports')
    .update(updates)
    .eq('id', id)
    .eq('status', currentStatus)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, data: null, error: 'Status was changed by another request. Please refresh and try again.' };
    }
    return { success: false, data: null, error: `Failed to update defect status: ${error.message}` };
  }

  return { success: true, data: mapRowToDefectReport(data as DefectReportRow), error: null };
}

// ── General Update ──

export async function updateDefectReport(
  id: string,
  input: UpdateDefectReportInput
): Promise<ServiceResult<DefectReport>> {
  const parsed = UpdateDefectReportInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, data: null, error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  const supabase = getSupabaseClient();
  const dbData = mapDefectReportToUpdate(parsed.data as UpdateDefectReportInput);

  if (Object.keys(dbData).length === 0) {
    return { success: false, data: null, error: 'No fields to update' };
  }

  const { data, error } = await supabase
    .from('defect_reports')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: `Failed to update defect report: ${error.message}` };
  }

  return { success: true, data: mapRowToDefectReport(data as DefectReportRow), error: null };
}

// ── Atomic Defect Acceptance ──

export interface AcceptDefectResult {
  maintenanceId: string;
  defectReportId: string;
}

/**
 * Atomically accept a defect report by creating a linked maintenance record
 * in a single database transaction. Prevents orphaned maintenance records.
 */
export async function acceptDefectReport(
  defectReportId: string,
  maintenanceInput: {
    assetId: string;
    title: string;
    description?: string | null;
    priority?: MaintenancePriority;
    status?: MaintenanceStatus;
    maintenanceType?: string | null;
    reportedBy?: string | null;
    assignedTo?: string | null;
    scheduledDate?: string | null;
    dueDate?: string | null;
    hazardAlertId?: string | null;
    scanEventId?: string | null;
    notes?: string | null;
  }
): Promise<ServiceResult<AcceptDefectResult>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('accept_defect_report', {
    p_defect_report_id: defectReportId,
    p_maintenance_input: {
      asset_id: maintenanceInput.assetId,
      title: maintenanceInput.title,
      description: maintenanceInput.description ?? null,
      priority: maintenanceInput.priority ?? 'medium',
      status: maintenanceInput.status ?? 'scheduled',
      maintenance_type: maintenanceInput.maintenanceType ?? null,
      reported_by: maintenanceInput.reportedBy ?? null,
      assigned_to: maintenanceInput.assignedTo ?? null,
      scheduled_date: maintenanceInput.scheduledDate ?? null,
      due_date: maintenanceInput.dueDate ?? null,
      hazard_alert_id: maintenanceInput.hazardAlertId ?? null,
      scan_event_id: maintenanceInput.scanEventId ?? null,
      notes: maintenanceInput.notes ?? null,
    },
  });

  if (error) {
    return { success: false, data: null, error: error.message };
  }

  const result = data as { maintenance_id: string; defect_report_id: string };
  return {
    success: true,
    data: {
      maintenanceId: result.maintenance_id,
      defectReportId: result.defect_report_id,
    },
    error: null,
  };
}

// ── Delete Defect Report ──

export async function deleteDefectReport(id: string): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('defect_reports').delete().eq('id', id);
  if (error) return { success: false, data: null, error: `Failed to delete defect report: ${error.message}` };
  return { success: true, data: undefined, error: null };
}

// ── Dashboard Statistics ──

export async function getDefectReportStats(): Promise<ServiceResult<DefectReportStats>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_defect_report_stats');

  if (error) {
    return { success: false, data: null, error: `Failed to fetch defect stats: ${error.message}` };
  }

  const stats = data as DefectReportStats;

  return {
    success: true,
    data: {
      total: stats.total ?? 0,
      reported: stats.reported ?? 0,
      accepted: stats.accepted ?? 0,
      resolved: stats.resolved ?? 0,
      dismissed: stats.dismissed ?? 0,
    },
    error: null,
  };
}

// ── Asset-scoped Defect Reports ──

export async function getAssetDefectReports(
  assetId: string
): Promise<ServiceResult<{ data: DefectReportListItem[]; hasMore: boolean }>> {
  return listDefectReports({ assetId, limit: 50 });
}
