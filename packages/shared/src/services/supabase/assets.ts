import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';
import type {
  Asset,
  AssetRow,
  AssetWithRelations,
  CreateAssetInput,
  UpdateAssetInput,
  ScanEvent,
  ScanEventWithScanner,
  CreateScanEventInput,
  MaintenanceRecord,
  MaintenanceRecordWithNames,
  HazardAlert,
  Depot,
  DepotRow,
} from '../../types/entities';
import type { AssetStatus, AssetCategory } from '../../types/enums';
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

/** Maintenance record row with joined reporter and assignee */
interface MaintenanceRowWithJoins extends MaintenanceRecordRow {
  reporter: { full_name: string } | null;
  assignee: { full_name: string } | null;
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
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Sort field mapping ──

const SORT_FIELD_MAP: Record<string, string> = {
  assetNumber: 'asset_number',
  category: 'category',
  status: 'status',
  lastLocationUpdatedAt: 'last_location_updated_at',
  registrationExpiry: 'registration_expiry',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

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
  } = params;

  const supabase = getSupabaseClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('assets')
    .select('*, depot:assigned_depot_id(name, code)', { count: 'exact' })
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
  const dbSortField = SORT_FIELD_MAP[sortField] ?? 'asset_number';
  query = query.order(dbSortField, { ascending: sortDirection === 'asc' });

  // Pagination
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return { data: null, error: `Failed to list assets: ${error.message}` };
  }

  const total = count ?? 0;

  interface ListAssetRow extends AssetRow {
    depot: { name: string; code: string } | null;
  }

  const assets = (data || []).map((row: ListAssetRow) => {
    const asset = mapRowToAsset(row as unknown as AssetRow);
    return {
      ...asset,
      depotName: row.depot?.name ?? null,
      depotCode: row.depot?.code ?? null,
      driverName: null,
      lastScannerName: null,
    } as AssetWithRelations;
  });

  return {
    data: {
      data: assets,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
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
      scanner:last_scanned_by(full_name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return { data: null, error: `Failed to fetch asset: ${error.message}` };
  }

  if (!data) {
    return { data: null, error: 'Asset not found' };
  }

  const row = data as unknown as AssetRowWithJoins;
  const asset = mapRowToAsset(row as unknown as AssetRow);

  return {
    data: {
      ...asset,
      depotName: row.depot?.name ?? null,
      depotCode: row.depot?.code ?? null,
      driverName: row.driver?.full_name ?? null,
      lastScannerName: row.scanner?.full_name ?? null,
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
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Invalid input' };
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
      return { data: null, error: 'An asset with this number already exists' };
    }
    return { data: null, error: `Failed to create asset: ${error.message}` };
  }

  return { data: mapRowToAsset(data as AssetRow), error: null };
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
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  const supabase = getSupabaseClient();
  const dbData = mapAssetToUpdate(parsed.data as UpdateAssetInput);

  if (Object.keys(dbData).length === 0) {
    return { data: null, error: 'No fields to update' };
  }

  const { data, error } = await supabase
    .from('assets')
    .update(dbData)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    return { data: null, error: `Failed to update asset: ${error.message}` };
  }

  return { data: mapRowToAsset(data as AssetRow), error: null };
}

/**
 * Soft-delete an asset by setting deleted_at.
 */
export async function softDeleteAsset(
  id: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('assets')
    .update({ deleted_at: new Date().toISOString(), status: 'out_of_service' })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: 'Asset not found or already retired' };
    }
    return { data: null, error: `Failed to retire asset: ${error.message}` };
  }

  return { data: undefined, error: null };
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
    return { data: null, error: `Failed to fetch scans: ${error.message}` };
  }

  const total = count ?? 0;
  const scans = (data || []).map((row: ScanEventRowWithJoins) => {
    const scan = mapRowToScanEvent(row as unknown as ScanEventRow);
    return {
      ...scan,
      scannerName: row.profiles?.full_name ?? null,
      assetNumber: row.assets?.asset_number ?? null,
      assetCategory: row.assets?.category ?? null,
    } as ScanEventWithScanner;
  });

  return {
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
    return { data: null, error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  const supabase = getSupabaseClient();
  const dbData = mapScanEventToInsert(parsed.data as CreateScanEventInput);

  const { data, error } = await supabase
    .from('scan_events')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    return { data: null, error: `Failed to create scan event: ${error.message}` };
  }

  return { data: mapRowToScanEvent(data), error: null };
}

/**
 * Lookup an asset by QR code data or asset number.
 */
export async function getAssetByQRCode(
  qrData: string
): Promise<ServiceResult<Asset>> {
  const supabase = getSupabaseClient();

  // Try exact qr_code_data match first
  let { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('qr_code_data', qrData)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    return { data: null, error: `Failed to lookup asset: ${error.message}` };
  }

  // Fallback: parse asset number from QR data (e.g., "rgr://asset/TL001" → "TL001")
  if (!data) {
    const assetNumber = extractAssetNumber(qrData);
    if (assetNumber) {
      const result = await supabase
        .from('assets')
        .select('*')
        .eq('asset_number', assetNumber)
        .is('deleted_at', null)
        .maybeSingle();

      data = result.data;
      error = result.error;

      if (error) {
        return { data: null, error: `Failed to lookup asset: ${error.message}` };
      }
    }
  }

  if (!data) {
    return { data: null, error: 'Asset not found for this QR code' };
  }

  return { data: mapRowToAsset(data as AssetRow), error: null };
}

/**
 * Get recent scans for a specific user (driver's activity).
 */
export async function getMyRecentScans(
  userId: string,
  limit: number = 50
): Promise<ServiceResult<ScanEventWithScanner[]>> {
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
    .limit(limit);

  if (error) {
    return { data: null, error: `Failed to fetch recent scans: ${error.message}` };
  }

  const scans = (data || []).map((row: ScanEventRowWithJoins) => {
    const scan = mapRowToScanEvent(row as unknown as ScanEventRow);
    return {
      ...scan,
      scannerName: row.profiles?.full_name ?? null,
      assetNumber: row.assets?.asset_number ?? null,
      assetCategory: row.assets?.category ?? null,
    } as ScanEventWithScanner;
  });

  return { data: scans, error: null };
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
      assignee:assigned_to(full_name)
    `,
      { count: 'exact' }
    )
    .eq('asset_id', assetId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { data: null, error: `Failed to fetch maintenance: ${error.message}` };
  }

  const total = count ?? 0;
  const records = (data || []).map((row: MaintenanceRowWithJoins) => {
    const record = mapRowToMaintenanceRecord(row as unknown as MaintenanceRecordRow);
    return {
      ...record,
      reporterName: row.reporter?.full_name ?? null,
      assigneeName: row.assignee?.full_name ?? null,
    } as MaintenanceRecordWithNames;
  });

  return {
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
    return { data: null, error: `Failed to fetch hazards: ${error.message}` };
  }

  const total = count ?? 0;
  const alerts = (data || []).map((row: HazardAlertRow) => mapRowToHazardAlert(row));

  return {
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
    .order('name');

  if (error) {
    return { data: null, error: `Failed to fetch depots: ${error.message}` };
  }

  return {
    data: (data || []).map((row: DepotRow) => mapRowToDepot(row)),
    error: null,
  };
}

// ── Helpers ──

/**
 * Extract asset number from QR code data.
 * Handles formats: "rgr://asset/TL001", "TL001", "asset:TL001"
 */
function extractAssetNumber(qrData: string): string | null {
  // rgr://asset/TL001
  const uriMatch = qrData.match(/rgr:\/\/asset\/([A-Z]{2}\d{3,})/i);
  if (uriMatch) return uriMatch[1].toUpperCase();

  // asset:TL001
  const colonMatch = qrData.match(/asset:([A-Z]{2}\d{3,})/i);
  if (colonMatch) return colonMatch[1].toUpperCase();

  // Plain asset number like TL001 or DL015
  const plainMatch = qrData.match(/^([A-Z]{2}\d{3,})$/i);
  if (plainMatch) return plainMatch[1].toUpperCase();

  return null;
}
