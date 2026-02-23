import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';
import type {
  MaintenanceRecord,
  MaintenanceRecordWithNames,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  MaintenanceRecordRow,
} from '../../types/entities';
import type { MaintenanceStatus, MaintenancePriority } from '../../types/enums';
import {
  mapRowToMaintenanceRecord,
  mapMaintenanceToInsert,
  mapMaintenanceToUpdate,
  CreateMaintenanceInputSchema,
  UpdateMaintenanceInputSchema,
} from '../../types/entities/maintenanceRecord';

// ── Types ──

export interface ListMaintenanceParams {
  status?: MaintenanceStatus[];
  priority?: MaintenancePriority[];
  assetId?: string;
  limit?: number;
  beforeId?: string; // Keyset pagination cursor
}

export interface MaintenanceStats {
  total: number;
  scheduled: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

/** Maintenance record row with joined reporter and asset */
interface MaintenanceRowWithJoins extends MaintenanceRecordRow {
  reporter: { full_name: string } | null;
  asset: { asset_number: string; category: string } | null;
}

/** Maintenance record for list display (excludes notes/parts_used) */
export interface MaintenanceListItem {
  id: string;
  assetId: string;
  title: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  maintenanceType: string | null;
  scheduledDate: string | null;
  dueDate: string | null;
  createdAt: string;
  reporterName: string | null;
  assetNumber: string | null;
  assetCategory: string | null;
}

// ── Status Transition Validation ──

const VALID_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function isValidTransition(from: MaintenanceStatus, to: MaintenanceStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── List Maintenance ──

/**
 * List maintenance records with filtering and keyset pagination.
 * Uses optimized query selecting only needed columns for list display.
 */
export async function listMaintenance(
  params: ListMaintenanceParams = {}
): Promise<ServiceResult<MaintenanceListItem[]>> {
  const { status, priority, assetId, limit = 20, beforeId } = params;

  const supabase = getSupabaseClient();

  // Select only columns needed for list display (excludes notes, parts_used)
  let query = supabase
    .from('maintenance_records')
    .select(`
      id, asset_id, title, priority, status, maintenance_type,
      scheduled_date, due_date, created_at,
      reporter:reported_by(full_name),
      asset:asset_id(asset_number, category)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Apply filters
  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  if (priority && priority.length > 0) {
    query = query.in('priority', priority);
  }

  if (assetId) {
    query = query.eq('asset_id', assetId);
  }

  // Keyset pagination: fetch records created before the cursor
  if (beforeId) {
    // First get the created_at of the cursor record
    const { data: cursorData } = await supabase
      .from('maintenance_records')
      .select('created_at')
      .eq('id', beforeId)
      .single();

    if (cursorData?.created_at) {
      query = query.lt('created_at', cursorData.created_at);
    }
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, data: null, error: `Failed to list maintenance: ${error.message}` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: MaintenanceListItem[] = (data || []).map((row: any) => {
    // Handle joined relations which may be object or null
    const reporter = row.reporter;
    const asset = row.asset;

    return {
      id: row.id,
      assetId: row.asset_id,
      title: row.title,
      priority: row.priority as MaintenancePriority,
      status: row.status as MaintenanceStatus,
      maintenanceType: row.maintenance_type,
      scheduledDate: row.scheduled_date,
      dueDate: row.due_date,
      createdAt: row.created_at,
      reporterName: reporter?.full_name ?? null,
      assetNumber: asset?.asset_number ?? null,
      assetCategory: asset?.category ?? null,
    };
  });

  return { success: true, data: items, error: null };
}

// ── Get Single Maintenance Record ──

/**
 * Get a single maintenance record by ID with full details.
 */
export async function getMaintenanceById(
  id: string
): Promise<ServiceResult<MaintenanceRecordWithNames>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('maintenance_records')
    .select(`
      *,
      reporter:reported_by(full_name),
      assignee:assigned_to(full_name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return { success: false, data: null, error: `Failed to fetch maintenance record: ${error.message}` };
  }

  if (!data) {
    return { success: false, data: null, error: 'Maintenance record not found' };
  }

  const { reporter, assignee, ...maintenanceRow } = data as MaintenanceRowWithJoins & { assignee: { full_name: string } | null };
  const record = mapRowToMaintenanceRecord(maintenanceRow as MaintenanceRecordRow);

  return {
    success: true,
    data: {
      ...record,
      reporterName: reporter?.full_name ?? null,
      assigneeName: assignee?.full_name ?? null,
    },
    error: null,
  };
}

// ── Create Maintenance Record ──

/**
 * Create a new maintenance record.
 */
export async function createMaintenance(
  input: CreateMaintenanceInput
): Promise<ServiceResult<MaintenanceRecord>> {
  const parsed = CreateMaintenanceInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, data: null, error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  const supabase = getSupabaseClient();
  const dbData = mapMaintenanceToInsert(parsed.data as CreateMaintenanceInput);

  const { data, error } = await supabase
    .from('maintenance_records')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    // Map common Postgres errors to user-friendly messages
    if (error.code === '23503') {
      return { success: false, data: null, error: 'Asset or user not found' };
    }
    return { success: false, data: null, error: `Failed to create maintenance record: ${error.message}` };
  }

  return { success: true, data: mapRowToMaintenanceRecord(data as MaintenanceRecordRow), error: null };
}

// ── Update Maintenance Status ──

/**
 * Update maintenance status with transition validation.
 * Automatically sets started_at when moving to in_progress,
 * and completed_at when moving to completed.
 */
export async function updateMaintenanceStatus(
  id: string,
  newStatus: MaintenanceStatus,
  actualCost?: number
): Promise<ServiceResult<MaintenanceRecord>> {
  const supabase = getSupabaseClient();

  // Get current status for transition validation
  const { data: current, error: fetchError } = await supabase
    .from('maintenance_records')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return { success: false, data: null, error: 'Maintenance record not found' };
  }

  const currentStatus = current.status as MaintenanceStatus;

  if (!isValidTransition(currentStatus, newStatus)) {
    return {
      success: false,
      data: null,
      error: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }

  // Build update payload with auto-timestamps
  const updates: Record<string, unknown> = { status: newStatus };

  if (newStatus === 'in_progress' && currentStatus === 'scheduled') {
    updates['started_at'] = new Date().toISOString();
  }

  if (newStatus === 'completed' && currentStatus === 'in_progress') {
    updates['completed_at'] = new Date().toISOString();
    if (actualCost !== undefined) {
      updates['actual_cost'] = actualCost;
    }
  }

  const { data, error } = await supabase
    .from('maintenance_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: `Failed to update status: ${error.message}` };
  }

  return { success: true, data: mapRowToMaintenanceRecord(data as MaintenanceRecordRow), error: null };
}

// ── General Update ──

/**
 * Update maintenance record fields.
 */
export async function updateMaintenance(
  id: string,
  input: UpdateMaintenanceInput
): Promise<ServiceResult<MaintenanceRecord>> {
  const parsed = UpdateMaintenanceInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, data: null, error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  const supabase = getSupabaseClient();
  const dbData = mapMaintenanceToUpdate(parsed.data as UpdateMaintenanceInput);

  if (Object.keys(dbData).length === 0) {
    return { success: false, data: null, error: 'No fields to update' };
  }

  const { data, error } = await supabase
    .from('maintenance_records')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: `Failed to update maintenance record: ${error.message}` };
  }

  return { success: true, data: mapRowToMaintenanceRecord(data as MaintenanceRecordRow), error: null };
}

// ── Dashboard Statistics ──

/**
 * Get maintenance statistics using efficient RPC.
 */
export async function getMaintenanceStats(): Promise<ServiceResult<MaintenanceStats>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_maintenance_stats');

  if (error) {
    return { success: false, data: null, error: `Failed to fetch maintenance stats: ${error.message}` };
  }

  // RPC returns JSON object directly
  const stats = data as MaintenanceStats;

  return {
    success: true,
    data: {
      total: stats.total ?? 0,
      scheduled: stats.scheduled ?? 0,
      in_progress: stats.in_progress ?? 0,
      completed: stats.completed ?? 0,
      cancelled: stats.cancelled ?? 0,
      overdue: stats.overdue ?? 0,
    },
    error: null,
  };
}
