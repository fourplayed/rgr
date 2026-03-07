import { getSupabaseClient } from './client';
import type { ServiceResult, PaginatedResult } from '../../types';
import type {
  Asset,
  AssetRow,
  AssetWithRelations,
  CreateAssetInput,
  UpdateAssetInput,
  ScanEvent,
  ScanEventWithScanner,
  CreateScanEventInput,
  MaintenanceRecordWithNames,
  HazardAlert,
  Depot,
  DepotRow,
} from '../../types/entities';
import type { AssetStatus, AssetCategory, DefectStatus, MaintenanceStatus, MaintenancePriority } from '../../types/enums';
import type { ScanEventRow } from '../../types/entities/scanEvent';
import type { MaintenanceRecordRow } from '../../types/entities/maintenanceRecord';
import type { HazardAlertRow } from '../../types/entities/hazardAlert';
import {
  mapRowToAsset,
  mapAssetToInsert,
  mapAssetToUpdate,
  CreateAssetInputSchema,
  UpdateAssetInputSchema,
} from '../../types/entities/asset';
import { AssetCategorySchema } from '../../types/enums/AssetEnums';
import { DefectStatusSchema } from '../../types/enums/DefectEnums';
import { MaintenanceStatusSchema, MaintenancePrioritySchema } from '../../types/enums/MaintenanceEnums';
import { safeParseEnum } from '../../utils/safeParseEnum';
import { isValidUUID, isValidISOTimestamp } from '../../utils/constants';
import {
  mapRowToScanEvent,
  mapScanEventToInsert,
  CreateScanEventInputSchema,
} from '../../types/entities/scanEvent';
import { mapRowToMaintenanceRecord } from '../../types/entities/maintenanceRecord';
import { mapRowToHazardAlert } from '../../types/entities/hazardAlert';
import { mapRowToDepot } from '../../types/entities/depot';

// ── Join Result Types ──

/** Asset row with joined depot, driver, and scanner relations */
interface AssetRowWithJoins extends AssetRow {
  depot: { name: string; code: string } | null;
  driver: { full_name: string } | null;
  scanner: { full_name: string } | null;
}

/** Scan event row with joined profile and asset */
interface ScanEventRowWithJoins extends ScanEventRow {
  profiles: { full_name: string } | null;
  assets: { asset_number: string; category: string } | null;
}

/** Maintenance record row with joined reporter, assignee, and completer */
interface MaintenanceRowWithJoins extends MaintenanceRecordRow {
  reporter: { full_name: string } | null;
  assignee: { full_name: string } | null;
  completer: { full_name: string } | null;
}

// ── Types ──

export interface ListAssetsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  statuses?: AssetStatus[];
  categories?: AssetCategory[];
  depotId?: string | null;
  depotIds?: string[];
  hasLocation?: boolean;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  /** Cursor for keyset pagination — value of the sort field from last item */
  cursor?: string;
  /** UUID of the last item for tie-breaking when cursor values collide */
  cursorId?: string;
}

// PaginatedResult<T> is now defined in '../../types' and imported above

// ── Sort field mapping ──

const SORT_FIELD_MAP = {
  assetNumber: 'asset_number',
  category: 'category',
  status: 'status',
  lastLocationUpdatedAt: 'last_location_updated_at',
  registrationExpiry: 'registration_expiry',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

// ── Asset CRUD ──

/**
 * List assets with filtering, sorting, and pagination.
 * Uses idx_assets_active_status and idx_assets_depot indexes.
 */
export async function listAssets(
  params: ListAssetsParams = {}
): Promise<ServiceResult<PaginatedResult<AssetWithRelations>>> {
  const {
    page = 1,
    pageSize = 20,
    search,
    statuses,
    categories,
    depotId,
    depotIds,
    hasLocation,
    sortField = 'assetNumber',
    sortDirection = 'asc',
    cursor,
    cursorId,
  } = params;

  const supabase = getSupabaseClient();
  const useCursorPagination = cursor !== undefined;

  // When using cursor pagination, fetch pageSize + 1 to detect hasMore
  const fetchLimit = useCursorPagination ? pageSize + 1 : pageSize;

  const selectOptions = useCursorPagination ? {} : { count: 'exact' as const };
  let query = supabase
    .from('assets')
    .select('*, depot:assigned_depot_id(name, code), photos(count)', selectOptions)
    .is('deleted_at', null);

  // Filters
  if (search) {
    // Escape PostgREST filter metacharacters to prevent query injection
    const safeSearch = search.replace(/[%_\\,().]/g, (c) => `\\${c}`);
    query = query.or(
      `asset_number.ilike.%${safeSearch}%,make.ilike.%${safeSearch}%,model.ilike.%${safeSearch}%,registration_number.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`
    );
  }

  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }

  if (categories && categories.length > 0) {
    query = query.in('category', categories);
  }

  if (depotIds && depotIds.length > 0) {
    query = query.in('assigned_depot_id', depotIds);
  } else if (depotId) {
    query = query.eq('assigned_depot_id', depotId);
  }

  if (hasLocation === true) {
    query = query.not('last_latitude', 'is', null).not('last_longitude', 'is', null);
  } else if (hasLocation === false) {
    query = query.or('last_latitude.is.null,last_longitude.is.null');
  }

  // Sort
  const dbSortField = SORT_FIELD_MAP[sortField as keyof typeof SORT_FIELD_MAP];
  if (!dbSortField) {
    console.warn(`[listAssets] Unknown sort field "${sortField}", falling back to asset_number`);
  }
  const resolvedSortField = dbSortField || 'asset_number';
  const ascending = sortDirection === 'asc';
  query = query.order(resolvedSortField, { ascending });
  // Secondary sort on id for deterministic ordering with ties
  query = query.order('id', { ascending });

  // Pagination: cursor-based or offset-based
  if (useCursorPagination && cursorId) {
    // Validate cursor values to prevent PostgREST injection
    if (!isValidUUID(cursorId)) {
      return { success: true, data: { data: [], total: 0, page: 1, pageSize, totalPages: 0, hasMore: false }, error: null };
    }
    // Validate cursor value based on sort field type
    const isCursorSafe = resolvedSortField === 'asset_number'
      ? /^[a-zA-Z0-9_-]+$/.test(cursor!)
      : isValidISOTimestamp(cursor!);
    if (!isCursorSafe) {
      return { success: true, data: { data: [], total: 0, page: 1, pageSize, totalPages: 0, hasMore: false }, error: null };
    }
    // Composite cursor on (sortField, id) to handle ties
    const op = ascending ? 'gt' : 'lt';
    query = query.or(
      `${resolvedSortField}.${op}.${cursor},and(${resolvedSortField}.eq.${cursor},id.${op}.${cursorId})`
    );
  } else if (useCursorPagination && cursor) {
    const isCursorSafe = resolvedSortField === 'asset_number'
      ? /^[a-zA-Z0-9_-]+$/.test(cursor)
      : isValidISOTimestamp(cursor);
    if (!isCursorSafe) {
      return { success: true, data: { data: [], total: 0, page: 1, pageSize, totalPages: 0, hasMore: false }, error: null };
    }
    const op = ascending ? 'gt' : 'lt';
    query = query.filter(resolvedSortField, op, cursor);
  }

  // Limit
  if (useCursorPagination) {
    query = query.limit(fetchLimit);
  } else {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;

  if (error) {
    return { success: false, data: null, error: `Failed to list assets: ${error.message}` };
  }

  interface ListAssetRow extends AssetRow {
    depot: { name: string; code: string } | null;
    photos: [{ count: number }];
  }

  const rows = data || [];
  const hasMore = useCursorPagination && rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  const total = useCursorPagination ? -1 : (count ?? 0);

  const assets = pageRows.map((row: ListAssetRow) => {
    const { depot, photos, ...assetRow } = row;
    const asset = mapRowToAsset(assetRow as AssetRow);
    return {
      ...asset,
      depotName: depot?.name ?? null,
      depotCode: depot?.code ?? null,
      driverName: null,
      lastScannerName: null,
      photoCount: photos?.[0]?.count ?? 0,
    } as AssetWithRelations;
  });

  return {
    success: true,
    data: {
      data: assets,
      total,
      page: useCursorPagination ? 1 : page,
      pageSize,
      totalPages: useCursorPagination ? -1 : Math.ceil(total / pageSize),
      hasMore,
    },
    error: null,
  };
}

/**
 * Get a single asset by ID with joined relations.
 */
export async function getAsset(
  id: string
): Promise<ServiceResult<AssetWithRelations>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      depot:assigned_depot_id(name, code),
      driver:assigned_driver_id(full_name),
      scanner:last_scanned_by(full_name),
      photos(count)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return { success: false, data: null, error: `Failed to fetch asset: ${error.message}` };
  }

  if (!data) {
    return { success: false, data: null, error: 'Asset not found' };
  }

  const { depot, driver, scanner, photos, ...assetRow } = data as unknown as AssetRowWithJoins & { photos: [{ count: number }] };
  const asset = mapRowToAsset(assetRow as AssetRow);

  return {
    success: true,
    data: {
      ...asset,
      depotName: depot?.name ?? null,
      depotCode: depot?.code ?? null,
      driverName: driver?.full_name ?? null,
      lastScannerName: scanner?.full_name ?? null,
      photoCount: photos?.[0]?.count ?? 0,
    },
    error: null,
  };
}

/**
 * Create a new asset. Validates input with Zod.
 */
export async function createAsset(
  input: CreateAssetInput
): Promise<ServiceResult<Asset>> {
  const parsed = CreateAssetInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, data: null, error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  const supabase = getSupabaseClient();
  const dbData = mapAssetToInsert(parsed.data as CreateAssetInput);

  const { data, error } = await supabase
    .from('assets')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return { success: false, data: null, error: 'An asset with this number already exists' };
    }
    return { success: false, data: null, error: `Failed to create asset: ${error.message}` };
  }

  return { success: true, data: mapRowToAsset(data as AssetRow), error: null };
}

/**
 * Update an existing asset. Validates input with Zod.
 */
export async function updateAsset(
  id: string,
  input: UpdateAssetInput
): Promise<ServiceResult<Asset>> {
  const parsed = UpdateAssetInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, data: null, error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  const supabase = getSupabaseClient();
  const dbData = mapAssetToUpdate(parsed.data as UpdateAssetInput);

  if (Object.keys(dbData).length === 0) {
    return { success: false, data: null, error: 'No fields to update' };
  }

  const { data, error } = await supabase
    .from('assets')
    .update(dbData)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: `Failed to update asset: ${error.message}` };
  }

  return { success: true, data: mapRowToAsset(data as AssetRow), error: null };
}

/**
 * Soft-delete an asset by setting deleted_at.
 */
export async function softDeleteAsset(
  id: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('assets')
    .update({ deleted_at: new Date().toISOString(), status: 'out_of_service' })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, data: null, error: 'Asset not found or already retired' };
    }
    return { success: false, data: null, error: `Failed to retire asset: ${error.message}` };
  }

  return { success: true, data: undefined, error: null };
}

// ── Scan Events ──

/**
 * Get scan events for an asset. Uses idx_scan_events_asset.
 */
export async function getAssetScans(
  assetId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ServiceResult<PaginatedResult<ScanEventWithScanner>>> {
  const supabase = getSupabaseClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('scan_events')
    .select(
      `
      *,
      profiles(full_name),
      assets!inner(asset_number, category)
    `,
      { count: 'exact' }
    )
    .eq('asset_id', assetId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { success: false, data: null, error: `Failed to fetch scans: ${error.message}` };
  }

  const total = count ?? 0;
  const scans = (data || []).map((row: ScanEventRowWithJoins) => {
    const { profiles, assets, ...scanRow } = row;
    const scan = mapRowToScanEvent(scanRow as ScanEventRow);
    return {
      ...scan,
      scannerName: profiles?.full_name ?? null,
      assetNumber: assets?.asset_number ?? null,
      assetCategory: safeParseEnum(AssetCategorySchema, assets?.category, null),
    } as ScanEventWithScanner;
  });

  return {
    success: true,
    data: {
      data: scans,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    error: null,
  };
}

/**
 * Create a new scan event. Used by mobile QR scanner.
 */
export async function createScanEvent(
  input: CreateScanEventInput
): Promise<ServiceResult<ScanEvent>> {
  const parsed = CreateScanEventInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, data: null, error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  const supabase = getSupabaseClient();
  const dbData = mapScanEventToInsert(parsed.data as CreateScanEventInput);

  const { data, error } = await supabase
    .from('scan_events')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: `Failed to create scan event: ${error.message}` };
  }

  return { success: true, data: mapRowToScanEvent(data), error: null };
}

/**
 * Lookup an asset by QR code data or asset number.
 */
export async function getAssetByQRCode(
  qrData: string
): Promise<ServiceResult<Asset>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .rpc('lookup_asset_by_qr', { p_qr_data: qrData })
    .maybeSingle();

  if (error) {
    return { success: false, data: null, error: `Failed to lookup asset: ${error.message}` };
  }
  if (!data) {
    return { success: false, data: null, error: 'Asset not found for this QR code' };
  }

  return { success: true, data: mapRowToAsset(data as AssetRow), error: null };
}

/**
 * Get total count of all scan events (server-side COUNT).
 */
export async function getTotalScanCount(): Promise<ServiceResult<number>> {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from('scan_events')
    .select('id', { count: 'exact', head: true });

  if (error) {
    return { success: false, data: null, error: `Failed to fetch scan count: ${error.message}` };
  }

  return { success: true, data: count ?? 0, error: null };
}

/**
 * Get recent scans across all users (global activity).
 */
export async function getRecentScans(
  limit: number = 50
): Promise<ServiceResult<ScanEventWithScanner[]>> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('scan_events')
    .select(`
      *,
      profiles(full_name),
      assets!inner(asset_number, category)
    `)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    return { success: false, data: null, error: `Failed to fetch recent scans: ${error.message}` };
  }

  const scans = (data || []).map((row: ScanEventRowWithJoins) => {
    const { profiles, assets, ...scanRow } = row;
    const scan = mapRowToScanEvent(scanRow as ScanEventRow);
    return {
      ...scan,
      scannerName: profiles?.full_name ?? null,
      assetNumber: assets?.asset_number ?? null,
      assetCategory: safeParseEnum(AssetCategorySchema, assets?.category, null),
    } as ScanEventWithScanner;
  });

  return { success: true, data: scans, error: null };
}

/**
 * Get recent scans for a specific user (driver's activity).
 */
export async function getMyRecentScans(
  userId: string,
  limit: number = 50
): Promise<ServiceResult<ScanEventWithScanner[]>> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('scan_events')
    .select(`
      *,
      profiles(full_name),
      assets!inner(asset_number, category)
    `)
    .eq('scanned_by', userId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    return { success: false, data: null, error: `Failed to fetch recent scans: ${error.message}` };
  }

  const scans = (data || []).map((row: ScanEventRowWithJoins) => {
    const { profiles, assets, ...scanRow } = row;
    const scan = mapRowToScanEvent(scanRow as ScanEventRow);
    return {
      ...scan,
      scannerName: profiles?.full_name ?? null,
      assetNumber: assets?.asset_number ?? null,
      assetCategory: safeParseEnum(AssetCategorySchema, assets?.category, null),
    } as ScanEventWithScanner;
  });

  return { success: true, data: scans, error: null };
}

// ── Maintenance Records ──

/**
 * Get maintenance records for an asset. Uses idx_maintenance_history.
 */
export async function getAssetMaintenance(
  assetId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ServiceResult<PaginatedResult<MaintenanceRecordWithNames>>> {
  const supabase = getSupabaseClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('maintenance_records')
    .select(
      `
      *,
      reporter:reported_by(full_name),
      assignee:assigned_to(full_name),
      completer:completed_by(full_name)
    `,
      { count: 'exact' }
    )
    .eq('asset_id', assetId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { success: false, data: null, error: `Failed to fetch maintenance: ${error.message}` };
  }

  const total = count ?? 0;
  const records = (data || []).map((row: MaintenanceRowWithJoins) => {
    const { reporter, assignee, completer, ...maintenanceRow } = row;
    const record = mapRowToMaintenanceRecord(maintenanceRow as MaintenanceRecordRow);
    return {
      ...record,
      reporterName: reporter?.full_name ?? null,
      assigneeName: assignee?.full_name ?? null,
      completerName: completer?.full_name ?? null,
    } as MaintenanceRecordWithNames;
  });

  return {
    success: true,
    data: {
      data: records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    error: null,
  };
}

// ── Hazard Alerts ──

/**
 * Get hazard alerts for an asset. Uses idx_hazard_alerts_asset.
 */
export async function getAssetHazards(
  assetId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ServiceResult<PaginatedResult<HazardAlert>>> {
  const supabase = getSupabaseClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('hazard_alerts')
    .select('*', { count: 'exact' })
    .eq('asset_id', assetId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { success: false, data: null, error: `Failed to fetch hazards: ${error.message}` };
  }

  const total = count ?? 0;
  const alerts = (data || []).map((row: HazardAlertRow) => mapRowToHazardAlert(row));

  return {
    success: true,
    data: {
      data: alerts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    error: null,
  };
}

// ── Depots ──

/**
 * List all active depots.
 */
export async function listDepots(): Promise<ServiceResult<Depot[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('depots')
    .select('*')
    .eq('is_active', true)
    .order('name')
    .limit(200);

  if (error) {
    return { success: false, data: null, error: `Failed to fetch depots: ${error.message}` };
  }

  return {
    success: true,
    data: (data || []).map((row: DepotRow) => mapRowToDepot(row)),
    error: null,
  };
}

// ── Asset Statistics ──

/**
 * Asset count by status from RPC function
 */
export interface AssetCountByStatus {
  status: string;
  count: number;
}

/**
 * Get asset counts grouped by status using server-side RPC.
 * More efficient than fetching all assets and counting client-side.
 */
export async function getAssetCountsByStatus(): Promise<ServiceResult<AssetCountByStatus[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_asset_counts_by_status');

  if (error) {
    return { success: false, data: null, error: `Failed to fetch asset counts: ${error.message}` };
  }

  return {
    success: true,
    data: (data || []).map((row: { status: string; count: string | number }) => ({
      status: row.status,
      count: typeof row.count === 'string' ? parseInt(row.count, 10) : row.count,
    })),
    error: null,
  };
}

// ── Asset Scan Context (mechanic context card) ──

/**
 * Shape returned by the `get_asset_scan_context` RPC.
 */
export interface AssetScanContext {
  openDefectCount: number;
  activeTaskCount: number;
  openDefects: Array<{
    id: string;
    title: string;
    status: DefectStatus;
    createdAt: string;
  }>;
  activeTasks: Array<{
    id: string;
    title: string;
    status: MaintenanceStatus;
    priority: MaintenancePriority;
    createdAt: string;
  }>;
}

/**
 * Fetch open defect/task counts + top-3 items for a given asset
 * in a single DB round-trip. Used by the mechanic scan context card.
 */
export async function getAssetScanContext(
  assetId: string
): Promise<ServiceResult<AssetScanContext>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_asset_scan_context', {
    p_asset_id: assetId,
  });

  if (error) {
    return { success: false, data: null, error: `Failed to fetch scan context: ${error.message}` };
  }

  const raw = data as {
    open_defect_count: number;
    active_task_count: number;
    open_defects: Array<{ id: string; title: string; status: string; created_at: string }>;
    active_tasks: Array<{ id: string; title: string; status: string; priority: string; created_at: string }>;
  };

  return {
    success: true,
    data: {
      openDefectCount: raw.open_defect_count,
      activeTaskCount: raw.active_task_count,
      openDefects: (raw.open_defects ?? []).map((d) => ({
        id: d.id,
        title: d.title,
        status: safeParseEnum(DefectStatusSchema, d.status, 'reported'),
        createdAt: d.created_at,
      })),
      activeTasks: (raw.active_tasks ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        status: safeParseEnum(MaintenanceStatusSchema, t.status, 'scheduled'),
        priority: safeParseEnum(MaintenancePrioritySchema, t.priority, 'medium'),
        createdAt: t.created_at,
      })),
    },
    error: null,
  };
}

// ── Delete Scan Event (undo support) ──

/**
 * Delete a scan event by ID. Used by the mobile undo flow.
 * RLS restricts this to the scanner's own recent scans (< 30s).
 */
export async function deleteScanEvent(
  id: string
): Promise<ServiceResult<null>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('scan_events')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, data: null, error: `Failed to delete scan event: ${error.message}` };
  }

  return { success: true, data: null, error: null };
}

// ── Helpers ──

/**
 * Extract asset number from QR code data.
 * Handles formats: "rgr://asset/TL001", "TL001", "asset:TL001"
 */
