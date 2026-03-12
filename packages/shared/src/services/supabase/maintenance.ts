import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';
import type {
  MaintenanceRecord,
  MaintenanceRecordWithNames,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  MaintenanceRecordRow,
} from '../../types/entities';
import type {
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceType,
  AssetCategory,
} from '../../types/enums';
import {
  mapRowToMaintenanceRecord,
  mapMaintenanceToInsert,
  mapMaintenanceToUpdate,
  CreateMaintenanceInputSchema,
  UpdateMaintenanceInputSchema,
} from '../../types/entities/maintenanceRecord';
import {
  MaintenanceTypeSchema,
  MaintenancePrioritySchema,
  MaintenanceStatusSchema,
} from '../../types/enums/MaintenanceEnums';
import { AssetCategorySchema } from '../../types/enums/AssetEnums';
import { safeParseEnum } from '../../utils/safeParseEnum';
import { isValidUUID, isValidISOTimestamp } from '../../utils/constants';
import { assertQueryResult } from '../../utils';

// ── Types ──

export interface ListMaintenanceParams {
  status?: MaintenanceStatus[];
  priority?: MaintenancePriority[];
  assetId?: string;
  limit?: number;
  /** Composite cursor for keyset pagination — pass both values from the last item */
  cursor?: { createdAt: string; id: string };
  /** Hide completed tasks where completed_at is older than this many days */
  staleCutoffDays?: number;
}

export interface MaintenanceStats {
  total: number;
  scheduled: number;
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
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  maintenanceType: MaintenanceType | null;
  scheduledDate: string | null;
  dueDate: string | null;
  createdAt: string;
  reporterName: string | null;
  assetNumber: string | null;
  assetCategory: AssetCategory | null;
}

// ── Status Transition Validation ──

const VALID_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  scheduled: ['in_progress', 'completed', 'cancelled'],
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
): Promise<ServiceResult<{ data: MaintenanceListItem[]; hasMore: boolean }>> {
  const { status, priority, assetId, limit = 20, cursor, staleCutoffDays } = params;

  const supabase = getSupabaseClient();

  // Fetch limit + 1 to detect if more pages exist
  let query = supabase
    .from('maintenance_records')
    .select(
      `
      id, asset_id, title, description, priority, status, maintenance_type,
      scheduled_date, due_date, created_at,
      reporter:reported_by(full_name),
      asset:asset_id(asset_number, category)
    `
    )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

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

  // Composite cursor keyset pagination — no extra lookup query needed.
  // Handles ties in created_at by using id as a tiebreaker.
  if (cursor) {
    if (!isValidISOTimestamp(cursor.createdAt) || !isValidUUID(cursor.id)) {
      return { success: true, data: { data: [], hasMore: false }, error: null };
    }
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
    );
  }

  // Hide completed tasks older than the cutoff to reduce list clutter
  if (staleCutoffDays !== undefined) {
    const cutoff = new Date(Date.now() - staleCutoffDays * 24 * 60 * 60 * 1000).toISOString();
    query = query.or(`status.neq.completed,completed_at.is.null,completed_at.gt.${cutoff}`);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, data: null, error: `Failed to list maintenance: ${error.message}` };
  }

  interface MaintenanceListRow {
    id: string;
    asset_id: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    maintenance_type: string | null;
    scheduled_date: string | null;
    due_date: string | null;
    created_at: string;
    reporter: { full_name: string } | null;
    asset: { asset_number: string; category: string } | null;
  }

  const rows = assertQueryResult<MaintenanceListRow[]>(data || []);
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const items: MaintenanceListItem[] = pageRows.map((row) => ({
    id: row.id,
    assetId: row.asset_id,
    title: row.title,
    description: row.description,
    priority: safeParseEnum(MaintenancePrioritySchema, row.priority, 'medium'),
    status: safeParseEnum(MaintenanceStatusSchema, row.status, 'scheduled'),
    maintenanceType: safeParseEnum(MaintenanceTypeSchema, row.maintenance_type, null),
    scheduledDate: row.scheduled_date,
    dueDate: row.due_date,
    createdAt: row.created_at,
    reporterName: row.reporter?.full_name ?? null,
    assetNumber: row.asset?.asset_number ?? null,
    assetCategory: safeParseEnum(AssetCategorySchema, row.asset?.category, null),
  }));

  return { success: true, data: { data: items, hasMore }, error: null };
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
    .select(
      `
      *,
      reporter:reported_by(full_name),
      assignee:assigned_to(full_name),
      completer:completed_by(full_name)
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch maintenance record: ${error.message}`,
    };
  }

  if (!data) {
    return { success: false, data: null, error: 'Maintenance record not found' };
  }

  const { reporter, assignee, completer, ...maintenanceRow } = assertQueryResult<
    MaintenanceRowWithJoins & {
      assignee: { full_name: string } | null;
      completer: { full_name: string } | null;
    }
  >(data);
  const record = mapRowToMaintenanceRecord(maintenanceRow as MaintenanceRecordRow);

  return {
    success: true,
    data: {
      ...record,
      reporterName: reporter?.full_name ?? null,
      assigneeName: assignee?.full_name ?? null,
      completerName: completer?.full_name ?? null,
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
    return {
      success: false,
      data: null,
      error: parsed.error.errors[0]?.message ?? 'Invalid input',
    };
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
    return {
      success: false,
      data: null,
      error: `Failed to create maintenance record: ${error.message}`,
    };
  }

  return {
    success: true,
    data: mapRowToMaintenanceRecord(data as MaintenanceRecordRow),
    error: null,
  };
}

// ── Update Maintenance Status ──

/**
 * Update maintenance status with transition validation.
 * Automatically sets completed_at when moving to completed.
 */
export async function updateMaintenanceStatus(
  id: string,
  newStatus: MaintenanceStatus,
  extras?: { completedBy?: string }
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
  const updates: { status: MaintenanceStatus; completed_at?: string; completed_by?: string } = {
    status: newStatus,
  };

  if (newStatus === 'completed' && currentStatus === 'scheduled') {
    updates.completed_at = new Date().toISOString();
    if (extras?.completedBy) {
      updates.completed_by = extras.completedBy;
    }
  }

  const { data, error } = await supabase
    .from('maintenance_records')
    .update(updates)
    .eq('id', id)
    .eq('status', currentStatus)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        success: false,
        data: null,
        error: 'Status was changed by another request. Please refresh and try again.',
      };
    }
    return { success: false, data: null, error: `Failed to update status: ${error.message}` };
  }

  return {
    success: true,
    data: mapRowToMaintenanceRecord(data as MaintenanceRecordRow),
    error: null,
  };
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
    return {
      success: false,
      data: null,
      error: parsed.error.errors[0]?.message ?? 'Invalid input',
    };
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
    return {
      success: false,
      data: null,
      error: `Failed to update maintenance record: ${error.message}`,
    };
  }

  return {
    success: true,
    data: mapRowToMaintenanceRecord(data as MaintenanceRecordRow),
    error: null,
  };
}

// ── Cancel (Delete) Maintenance Task ──

/**
 * Atomically delete a maintenance task and any linked defect reports.
 * Uses an RPC to ensure both deletions happen in a single transaction.
 */
export async function cancelMaintenanceTask(id: string): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('cancel_maintenance_task', { p_maintenance_id: id });
  if (error)
    return {
      success: false,
      data: null,
      error: `Failed to cancel maintenance task: ${error.message}`,
    };
  return { success: true, data: undefined, error: null };
}

// ── Dashboard Statistics ──

/**
 * Get maintenance statistics using efficient RPC.
 */
export async function getMaintenanceStats(): Promise<ServiceResult<MaintenanceStats>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_maintenance_stats');

  if (error) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch maintenance stats: ${error.message}`,
    };
  }

  if (data == null || typeof data !== 'object') {
    return { success: false, data: null, error: 'Invalid maintenance stats response' };
  }

  // RPC returns JSON with snake_case keys — use bracket access for index signature
  const stats = data as Record<string, number>;

  return {
    success: true,
    data: {
      total: stats['total'] ?? 0,
      scheduled: stats['scheduled'] ?? 0,
      completed: stats['completed'] ?? 0,
      cancelled: stats['cancelled'] ?? 0,
      overdue: stats['overdue'] ?? 0,
    },
    error: null,
  };
}
