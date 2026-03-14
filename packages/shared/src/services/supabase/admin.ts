import { getSupabaseClient, getSupabaseConfig } from './client';

function logServiceError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[admin] ${context}: ${message}`);
}
import type { ServiceResult, PaginatedResult } from '../../types';
import type { UserRole, AssetStatus, PhotoType } from '../../types/enums';
import type { MaintenanceStatus } from '../../types/enums/MaintenanceEnums';
import type { DefectStatus } from '../../types/enums/DefectEnums';
import { getFleetStatistics } from './fleet';
import { getMaintenanceStats } from './maintenance';
import { getDefectReportStats } from './defectReports';
import { getTotalScanCount } from './assets';
import type {
  Profile,
  ProfileRow,
  AdminUpdateProfileInput,
  CreateUserInput,
} from '../../types/api/auth';
import type {
  Depot,
  DepotRow,
  CreateDepotInput,
  UpdateDepotInput,
} from '../../types/entities/depot';
import type { AuditLogWithUser, AuditLogRow } from '../../types/entities/auditLog';
import {
  mapRowToProfile,
  AdminUpdateProfileInputSchema,
  mapAdminProfileToUpdate,
} from '../../types/api/auth';
import {
  mapRowToDepot,
  mapDepotToInsert,
  mapDepotToUpdate,
  CreateDepotInputSchema,
  UpdateDepotInputSchema,
} from '../../types/entities/depot';
import { mapRowToAuditLog } from '../../types/entities/auditLog';
import { isValidUUID, isValidISOTimestamp } from '../../utils/constants';
import { assertQueryResult } from '../../utils';
import { safeParseEnum } from '../../utils/safeParseEnum';
import { MaintenanceStatusSchema } from '../../types/enums/MaintenanceEnums';
import { DefectStatusSchema } from '../../types/enums/DefectEnums';
import { BulkCancelMaintenanceResultSchema } from '../../types/rpcResults';

// ── List Profiles ──

export interface ListProfilesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  roles?: UserRole[];
  isActive?: boolean;
}

export async function listProfiles(
  params: ListProfilesParams = {}
): Promise<ServiceResult<PaginatedResult<Profile>>> {
  const { page = 1, pageSize = 20, search, roles, isActive } = params;

  try {
    const supabase = getSupabaseClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('profiles').select('*', { count: 'exact' });

    if (search) {
      const safeSearch = search.replace(/[%_\\,().]/g, (c) => `\\${c}`);
      query = query.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
    }

    if (roles && roles.length > 0) {
      query = query.in('role', roles);
    }

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    query = query.order('full_name', { ascending: true }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    const total = count ?? 0;
    const profiles = (data as ProfileRow[]).map(mapRowToProfile);

    return {
      success: true,
      data: {
        data: profiles,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      error: null,
    };
  } catch (err) {
    logServiceError('listProfiles', err);
    return { success: false, data: null, error: 'Failed to load users' };
  }
}

// ── Admin Update Profile ──

export async function adminUpdateProfile(
  userId: string,
  input: AdminUpdateProfileInput
): Promise<ServiceResult<Profile>> {
  const validation = AdminUpdateProfileInputSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      data: null,
      error: validation.error.errors[0]?.message ?? 'Invalid input',
    };
  }

  try {
    const supabase = getSupabaseClient();
    const dbUpdates = mapAdminProfileToUpdate(input);

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, data: null, error: 'User not found or insufficient permissions' };
      }
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: mapRowToProfile(data as ProfileRow), error: null };
  } catch (err) {
    logServiceError('adminUpdateProfile', err);
    return { success: false, data: null, error: 'Failed to update user' };
  }
}

// ── Depot Management ──

export async function listAllDepots(): Promise<ServiceResult<Depot[]>> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('depots')
      .select('*')
      .order('name', { ascending: true })
      .limit(500);

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    return {
      success: true,
      data: (data as DepotRow[]).map(mapRowToDepot),
      error: null,
    };
  } catch (err) {
    logServiceError('listAllDepots', err);
    return { success: false, data: null, error: 'Failed to load depots' };
  }
}

export async function createDepot(input: CreateDepotInput): Promise<ServiceResult<Depot>> {
  const validation = CreateDepotInputSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      data: null,
      error: validation.error.errors[0]?.message ?? 'Invalid input',
    };
  }

  try {
    const supabase = getSupabaseClient();
    const dbInsert = mapDepotToInsert(input);

    const { data, error } = await supabase.from('depots').insert(dbInsert).select().single();

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: mapRowToDepot(data as DepotRow), error: null };
  } catch (err) {
    logServiceError('createDepot', err);
    return { success: false, data: null, error: 'Failed to create depot' };
  }
}

export async function updateDepot(
  id: string,
  input: UpdateDepotInput
): Promise<ServiceResult<Depot>> {
  const validation = UpdateDepotInputSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      data: null,
      error: validation.error.errors[0]?.message ?? 'Invalid input',
    };
  }

  try {
    const supabase = getSupabaseClient();
    const dbUpdates = mapDepotToUpdate(input);

    const { data, error } = await supabase
      .from('depots')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: mapRowToDepot(data as DepotRow), error: null };
  } catch (err) {
    logServiceError('updateDepot', err);
    return { success: false, data: null, error: 'Failed to update depot' };
  }
}

export async function deleteDepot(id: string): Promise<ServiceResult<void>> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase.from('depots').delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return {
          success: false,
          data: null,
          error: 'Cannot delete: assets are assigned to this depot',
        };
      }
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: undefined, error: null };
  } catch (err) {
    logServiceError('deleteDepot', err);
    return { success: false, data: null, error: 'Failed to delete depot' };
  }
}

// ── Asset Administration ──

export { softDeleteAsset as deleteAsset, bulkSoftDeleteAssets, hardDeleteAssets } from './assets';

export async function getAssetRelatedCounts(
  id: string
): Promise<ServiceResult<{ scanEvents: number; maintenanceRecords: number }>> {
  try {
    const supabase = getSupabaseClient();

    const [scansResult, maintenanceResult] = await Promise.all([
      supabase.from('scan_events').select('id', { count: 'exact', head: true }).eq('asset_id', id),
      supabase
        .from('maintenance_records')
        .select('id', { count: 'exact', head: true })
        .eq('asset_id', id),
    ]);

    return {
      success: true,
      data: {
        scanEvents: scansResult.count ?? 0,
        maintenanceRecords: maintenanceResult.count ?? 0,
      },
      error: null,
    };
  } catch (err) {
    logServiceError('getAssetRelatedCounts', err);
    return { success: false, data: null, error: 'Failed to get related counts' };
  }
}

export async function bulkUpdateAssetStatus(
  ids: string[],
  status: AssetStatus
): Promise<ServiceResult<{ updated: number; total: number }>> {
  if (ids.length === 0) {
    return { success: true, data: { updated: 0, total: 0 }, error: null };
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('assets')
      .update({ status })
      .in('id', ids)
      .is('deleted_at', null)
      .select('id');

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    const updated = data?.length ?? 0;
    return {
      success: true,
      data: { updated, total: ids.length },
      error: null,
    };
  } catch (err) {
    logServiceError('bulkUpdateAssetStatus', err);
    return { success: false, data: null, error: 'Failed to update assets' };
  }
}

// ── Audit Logs ──

export interface ListAuditLogsParams {
  pageSize?: number;
  cursor?: string; // created_at value for cursor-based pagination
  cursorId?: string; // id value for composite cursor tie-breaking
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

interface AuditLogRowWithUser extends AuditLogRow {
  profiles: { full_name: string } | null;
}

export async function listAuditLogs(
  params: ListAuditLogsParams = {}
): Promise<ServiceResult<{ data: AuditLogWithUser[]; hasMore: boolean }>> {
  const { pageSize = 30, cursor, cursorId, userId, action, startDate, endDate } = params;

  try {
    const supabase = getSupabaseClient();

    let query = supabase
      .from('audit_log')
      .select('*, profiles:user_id(full_name)')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(pageSize + 1); // Fetch one extra to detect hasMore

    // Composite cursor on (created_at, id) to handle identical timestamps
    if (cursor) {
      if (!isValidISOTimestamp(cursor)) {
        return { success: true, data: { data: [], hasMore: false }, error: null };
      }
      if (cursorId) {
        if (!isValidUUID(cursorId)) {
          return { success: true, data: { data: [], hasMore: false }, error: null };
        }
        query = query.or(`created_at.lt.${cursor},and(created_at.eq.${cursor},id.lt.${cursorId})`);
      } else {
        query = query.lt('created_at', cursor);
      }
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    const rows = data as AuditLogRowWithUser[];
    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

    const logs: AuditLogWithUser[] = pageRows.map((row) => ({
      ...mapRowToAuditLog(row),
      userName: row.profiles?.full_name ?? null,
    }));

    return {
      success: true,
      data: { data: logs, hasMore },
      error: null,
    };
  } catch (err) {
    logServiceError('listAuditLogs', err);
    return { success: false, data: null, error: 'Failed to load audit logs' };
  }
}

// ── Create User (calls edge function) ──

export async function adminCreateUser(input: CreateUserInput): Promise<
  ServiceResult<{
    user: { id: string; email: string };
    profile: { id: string; role: UserRole; fullName: string };
  }>
> {
  try {
    const config = getSupabaseConfig();
    const supabase = getSupabaseClient();

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      return { success: false, data: null, error: 'Not authenticated' };
    }

    const functionUrl = `${config.url}/functions/v1/admin-create-user`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: config.anonKey,
      },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        role: input.role,
        phone: input.phone ?? null,
        employeeId: input.employeeId ?? null,
        depot: input.depot ?? null,
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      return { success: false, data: null, error: body.error || 'Failed to create user' };
    }

    if (
      typeof body?.user?.id !== 'string' ||
      typeof body?.user?.email !== 'string' ||
      typeof body?.profile?.id !== 'string' ||
      typeof body?.profile?.role !== 'string' ||
      typeof body?.profile?.fullName !== 'string'
    ) {
      return { success: false, data: null, error: 'Invalid response from create user service' };
    }

    return { success: true, data: body, error: null };
  } catch (err) {
    logServiceError('adminCreateUser', err);
    const message = err instanceof Error ? err.message : 'Failed to create user';
    return { success: false, data: null, error: message };
  }
}

// ── Admin Data Dashboard ──

export interface AdminDataStats {
  totalAssets: number;
  activeAssets: number;
  totalMaintenance: number;
  scheduledMaintenance: number;
  totalDefects: number;
  reportedDefects: number;
  totalPhotos: number;
  totalScans: number;
}

export async function getAdminDataStats(): Promise<ServiceResult<AdminDataStats>> {
  try {
    const supabase = getSupabaseClient();

    const [fleetResult, maintResult, defectResult, scanResult, photoResult] = await Promise.all([
      getFleetStatistics(),
      getMaintenanceStats(),
      getDefectReportStats(),
      getTotalScanCount(),
      supabase.from('photos').select('id', { count: 'exact', head: true }),
    ]);

    return {
      success: true,
      data: {
        totalAssets: fleetResult.success ? fleetResult.data.totalAssets : 0,
        activeAssets: fleetResult.success ? fleetResult.data.activeAssets : 0,
        totalMaintenance: maintResult.success ? maintResult.data.total : 0,
        scheduledMaintenance: maintResult.success ? maintResult.data.scheduled : 0,
        totalDefects: defectResult.success ? defectResult.data.total : 0,
        reportedDefects: defectResult.success ? defectResult.data.reported : 0,
        totalPhotos: photoResult.count ?? 0,
        totalScans: scanResult.success ? scanResult.data : 0,
      },
      error: null,
    };
  } catch (err) {
    logServiceError('getAdminDataStats', err);
    return { success: false, data: null, error: 'Failed to load admin stats' };
  }
}

// ── Join row types (must match the .select() strings below) ──

interface MaintenanceJoinRow {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  created_at: string;
  reporter: { full_name: string } | null;
  asset: { asset_number: string } | null;
}

interface DefectJoinRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  reporter: { full_name: string } | null;
  asset: { asset_number: string } | null;
}

interface PhotoJoinRow {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  photo_type: PhotoType;
  created_at: string;
  asset: { asset_number: string } | null;
}

// ── Admin List Maintenance ──

export interface AdminListMaintenanceParams {
  page?: number;
  pageSize?: number;
  status?: MaintenanceStatus[];
  search?: string;
}

export interface AdminMaintenanceListItem {
  id: string;
  title: string;
  status: MaintenanceStatus;
  dueDate: string | null;
  createdAt: string;
  reporterName: string | null;
  assetNumber: string | null;
}

export async function adminListMaintenance(
  params: AdminListMaintenanceParams = {}
): Promise<ServiceResult<PaginatedResult<AdminMaintenanceListItem>>> {
  const { page = 1, pageSize = 30, status, search } = params;

  try {
    const supabase = getSupabaseClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('maintenance_records').select(
      `
        id, title, status, due_date, created_at,
        reporter:reported_by(full_name),
        asset:asset_id(asset_number)
      `,
      { count: 'exact' }
    );

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    if (search) {
      const safeSearch = search.replace(/[%_\\,().]/g, (c) => `\\${c}`);
      query = query.ilike('title', `%${safeSearch}%`);
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    const total = count ?? 0;
    // Supabase SDK can't resolve the ambiguous profiles FK — reporter:reported_by
    // hint works at runtime but generates a SelectQueryError at type level
    const rows = assertQueryResult<MaintenanceJoinRow[]>(data ?? []);
    const items: AdminMaintenanceListItem[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: safeParseEnum(MaintenanceStatusSchema, row.status, 'scheduled'),
      dueDate: row.due_date,
      createdAt: row.created_at,
      reporterName: row.reporter?.full_name ?? null,
      assetNumber: row.asset?.asset_number ?? null,
    }));

    return {
      success: true,
      data: {
        data: items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      error: null,
    };
  } catch (err) {
    logServiceError('adminListMaintenance', err);
    return { success: false, data: null, error: 'Failed to load maintenance records' };
  }
}

// ── Admin List Defect Reports ──

export interface AdminListDefectReportsParams {
  page?: number;
  pageSize?: number;
  status?: DefectStatus[];
  search?: string;
}

export interface AdminDefectListItem {
  id: string;
  title: string;
  status: DefectStatus;
  createdAt: string;
  reporterName: string | null;
  assetNumber: string | null;
}

export async function adminListDefectReports(
  params: AdminListDefectReportsParams = {}
): Promise<ServiceResult<PaginatedResult<AdminDefectListItem>>> {
  const { page = 1, pageSize = 30, status, search } = params;

  try {
    const supabase = getSupabaseClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('defect_reports').select(
      `
        id, title, status, created_at,
        reporter:reported_by(full_name),
        asset:asset_id(asset_number)
      `,
      { count: 'exact' }
    );

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    if (search) {
      const safeSearch = search.replace(/[%_\\,().]/g, (c) => `\\${c}`);
      query = query.ilike('title', `%${safeSearch}%`);
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    const total = count ?? 0;
    const defectRows = assertQueryResult<DefectJoinRow[]>(data ?? []);
    const items: AdminDefectListItem[] = defectRows.map((row) => ({
      id: row.id,
      title: row.title,
      status: safeParseEnum(DefectStatusSchema, row.status, 'reported'),
      createdAt: row.created_at,
      reporterName: row.reporter?.full_name ?? null,
      assetNumber: row.asset?.asset_number ?? null,
    }));

    return {
      success: true,
      data: {
        data: items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      error: null,
    };
  } catch (err) {
    logServiceError('adminListDefectReports', err);
    return { success: false, data: null, error: 'Failed to load defect reports' };
  }
}

// ── Admin List Photos ──

export interface AdminListPhotosParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface AdminPhotoListItem {
  id: string;
  storagePath: string;
  thumbnailPath: string | null;
  photoType: PhotoType;
  createdAt: string;
  assetNumber: string | null;
}

export async function adminListPhotos(
  params: AdminListPhotosParams = {}
): Promise<ServiceResult<PaginatedResult<AdminPhotoListItem>>> {
  const { page = 1, pageSize = 30, search } = params;

  try {
    const supabase = getSupabaseClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('photos').select(
      `
        id, storage_path, thumbnail_path, photo_type, created_at,
        asset:asset_id(asset_number)
      `,
      { count: 'exact' }
    );

    if (search) {
      const safeSearch = search.replace(/[%_\\,().]/g, (c) => `\\${c}`);
      // PostgREST filters on joined columns require a cast — the SDK doesn't
      // type this path. This works for PostgREST v11+ embedded filters.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.ilike('asset.asset_number' as any, `%${safeSearch}%`);
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    const total = count ?? 0;
    const photoRows = assertQueryResult<PhotoJoinRow[]>(data ?? []);
    const items: AdminPhotoListItem[] = photoRows.map((row) => ({
      id: row.id,
      storagePath: row.storage_path,
      thumbnailPath: row.thumbnail_path,
      photoType: row.photo_type,
      createdAt: row.created_at,
      assetNumber: row.asset?.asset_number ?? null,
    }));

    return {
      success: true,
      data: {
        data: items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      error: null,
    };
  } catch (err) {
    logServiceError('adminListPhotos', err);
    return { success: false, data: null, error: 'Failed to load photos' };
  }
}

// ── Bulk Cancel Maintenance Tasks ──

export async function bulkCancelMaintenanceTasks(
  ids: string[]
): Promise<ServiceResult<{ deleted: number; failed: string[] }>> {
  if (ids.length === 0) {
    return { success: true, data: { deleted: 0, failed: [] }, error: null };
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc('bulk_cancel_maintenance_tasks', {
      p_ids: ids,
    });

    if (error) {
      return { success: false, data: null, error: `Failed to cancel: ${error.message}` };
    }

    const parsed = BulkCancelMaintenanceResultSchema.safeParse(data ?? []);
    if (!parsed.success) {
      return {
        success: false,
        data: null,
        error: 'Unexpected RPC response shape for bulk_cancel_maintenance_tasks',
      };
    }

    const cancelledIds = new Set(parsed.data.map((r) => r.cancelled_id));
    const failed = ids.filter((id) => !cancelledIds.has(id));

    return {
      success: true,
      data: { deleted: cancelledIds.size, failed },
      error: null,
    };
  } catch (err) {
    logServiceError('bulkCancelMaintenanceTasks', err);
    return { success: false, data: null, error: 'Failed to cancel maintenance tasks' };
  }
}

// ── Bulk Delete Defect Reports ──

export async function bulkDeleteDefectReports(
  ids: string[]
): Promise<ServiceResult<{ deleted: number; failed: string[] }>> {
  if (ids.length === 0) {
    return { success: true, data: { deleted: 0, failed: [] }, error: null };
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('defect_reports')
      .delete()
      .in('id', ids)
      .select('id');

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    const deletedIds = new Set((data ?? []).map((r: { id: string }) => r.id));
    const failed = ids.filter((id) => !deletedIds.has(id));

    return {
      success: true,
      data: { deleted: deletedIds.size, failed },
      error: null,
    };
  } catch (err) {
    logServiceError('bulkDeleteDefectReports', err);
    return { success: false, data: null, error: 'Failed to delete defect reports' };
  }
}
