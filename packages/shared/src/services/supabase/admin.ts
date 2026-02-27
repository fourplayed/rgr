import { getSupabaseClient, getSupabaseConfig } from './client';
import type { ServiceResult, PaginatedResult } from '../../types';
import type { UserRole } from '../../types/enums';
import type { AssetStatus } from '../../types/enums';
import type {
  Profile,
  ProfileRow,
  AdminUpdateProfileInput,
  CreateUserInput,
} from '../../types/api/auth';
import type { Depot, DepotRow, CreateDepotInput, UpdateDepotInput } from '../../types/entities/depot';
import type { AuditLogWithUser, AuditLogRow } from '../../types/entities/auditLog';
import { mapRowToProfile, AdminUpdateProfileInputSchema, mapAdminProfileToUpdate } from '../../types/api/auth';
import { mapRowToDepot, mapDepotToInsert, mapDepotToUpdate, CreateDepotInputSchema, UpdateDepotInputSchema } from '../../types/entities/depot';
import { mapRowToAuditLog } from '../../types/entities/auditLog';

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
  const {
    page = 1,
    pageSize = 20,
    search,
    roles,
    isActive,
  } = params;

  try {
    const supabase = getSupabaseClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
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
    return { success: false, data: null, error: validation.error.errors[0]?.message ?? 'Invalid input' };
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
      .order('name', { ascending: true });

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    return {
      success: true,
      data: (data as DepotRow[]).map(mapRowToDepot),
      error: null,
    };
  } catch (err) {
    return { success: false, data: null, error: 'Failed to load depots' };
  }
}

export async function createDepot(
  input: CreateDepotInput
): Promise<ServiceResult<Depot>> {
  const validation = CreateDepotInputSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, data: null, error: validation.error.errors[0]?.message ?? 'Invalid input' };
  }

  try {
    const supabase = getSupabaseClient();
    const dbInsert = mapDepotToInsert(input);

    const { data, error } = await supabase
      .from('depots')
      .insert(dbInsert)
      .select()
      .single();

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: mapRowToDepot(data as DepotRow), error: null };
  } catch (err) {
    return { success: false, data: null, error: 'Failed to create depot' };
  }
}

export async function updateDepot(
  id: string,
  input: UpdateDepotInput
): Promise<ServiceResult<Depot>> {
  const validation = UpdateDepotInputSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, data: null, error: validation.error.errors[0]?.message ?? 'Invalid input' };
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
    return { success: false, data: null, error: 'Failed to update depot' };
  }
}

export async function deleteDepot(
  id: string
): Promise<ServiceResult<void>> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('depots')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return { success: false, data: null, error: 'Cannot delete: assets are assigned to this depot' };
      }
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: undefined, error: null };
  } catch (err) {
    return { success: false, data: null, error: 'Failed to delete depot' };
  }
}

// ── Asset Administration ──

export async function deleteAsset(
  id: string
): Promise<ServiceResult<void>> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('assets')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'out_of_service',
      })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: undefined, error: null };
  } catch (err) {
    return { success: false, data: null, error: 'Failed to delete asset' };
  }
}

export async function getAssetRelatedCounts(
  id: string
): Promise<ServiceResult<{ scanEvents: number; maintenanceRecords: number }>> {
  try {
    const supabase = getSupabaseClient();

    const [scansResult, maintenanceResult] = await Promise.all([
      supabase
        .from('scan_events')
        .select('id', { count: 'exact', head: true })
        .eq('asset_id', id),
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
    return { success: false, data: null, error: 'Failed to update assets' };
  }
}

// ── Audit Logs ──

export interface ListAuditLogsParams {
  pageSize?: number;
  cursor?: string; // created_at value for cursor-based pagination
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
  const {
    pageSize = 30,
    cursor,
    userId,
    action,
    startDate,
    endDate,
  } = params;

  try {
    const supabase = getSupabaseClient();

    let query = supabase
      .from('audit_logs')
      .select('*, profiles:user_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(pageSize + 1); // Fetch one extra to detect hasMore

    if (cursor) {
      query = query.lt('created_at', cursor);
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
    return { success: false, data: null, error: 'Failed to load audit logs' };
  }
}

// ── Create User (calls edge function) ──

export async function adminCreateUser(
  input: CreateUserInput
): Promise<ServiceResult<{ user: { id: string; email: string }; profile: { id: string; role: UserRole; fullName: string } }>> {
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
        'Authorization': `Bearer ${accessToken}`,
        'apikey': config.anonKey,
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

    return { success: true, data: body, error: null };
  } catch (err) {
    return { success: false, data: null, error: 'Failed to create user' };
  }
}
