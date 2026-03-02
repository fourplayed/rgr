import { getSupabaseClient } from './client';
import type { ServiceResult, PaginatedResult } from '../../types';
import type {
  AssetCountSession,
  AssetCountSessionRow,
  AssetCountSessionStatus,
  AssetCountItem,
  AssetCountItemRow,
  CombinationMetadata,
  CombinationMetadataRow,
  CombinationPhoto,
  CombinationPhotoRow,
  CreateAssetCountSessionInput,
  CreateAssetCountItemInput,
  CreateCombinationMetadataInput,
  CreateCombinationPhotoInput,
  SubmitAssetCountInput,
} from '../../types/entities/assetCount';
export type { SubmitAssetCountInput } from '../../types/entities/assetCount';
import {
  mapRowToAssetCountSession,
  mapRowToAssetCountItem,
  mapRowToCombinationMetadata,
  mapRowToCombinationPhoto,
  SubmitAssetCountInputSchema,
} from '../../types/entities/assetCount';

// ============================================================================
// Asset Count Session Functions
// ============================================================================

/**
 * Create a new asset count session.
 */
export async function createAssetCountSession(
  input: CreateAssetCountSessionInput
): Promise<ServiceResult<AssetCountSession>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('asset_count_sessions')
    .insert({
      depot_id: input.depotId,
      counted_by: input.countedBy,
    })
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: `Failed to create session: ${error.message}` };
  }

  return { success: true, data: mapRowToAssetCountSession(data as AssetCountSessionRow), error: null };
}

/**
 * Get an asset count session by ID.
 */
export async function getAssetCountSession(
  sessionId: string
): Promise<ServiceResult<AssetCountSession>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('asset_count_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, data: null, error: 'Session not found' };
    }
    return { success: false, data: null, error: `Failed to get session: ${error.message}` };
  }

  return { success: true, data: mapRowToAssetCountSession(data as AssetCountSessionRow), error: null };
}

/**
 * Complete an asset count session.
 */
export async function completeAssetCountSession(
  sessionId: string,
  notes?: string | null
): Promise<ServiceResult<AssetCountSession>> {
  const supabase = getSupabaseClient();

  const updateData: { status: 'completed'; completed_at: string; notes?: string | null } = {
    status: 'completed' as const,
    completed_at: new Date().toISOString(),
  };

  if (notes !== undefined && notes !== null) {
    updateData.notes = notes;
  }

  // Only allow completing sessions that are in_progress (guard against double-complete)
  const { data, error } = await supabase
    .from('asset_count_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .eq('status', 'in_progress')
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, data: null, error: 'Session not found or not in progress' };
    }
    return { success: false, data: null, error: `Failed to complete session: ${error.message}` };
  }

  return { success: true, data: mapRowToAssetCountSession(data as AssetCountSessionRow), error: null };
}

/**
 * Cancel an asset count session.
 */
export async function cancelAssetCountSession(
  sessionId: string
): Promise<ServiceResult<AssetCountSession>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('asset_count_sessions')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('status', 'in_progress')
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: `Failed to cancel session: ${error.message}` };
  }

  return { success: true, data: mapRowToAssetCountSession(data as AssetCountSessionRow), error: null };
}

/**
 * Delete an asset count session (superuser only).
 * Cascades to all related items, metadata, and photos via ON DELETE CASCADE.
 */
export async function deleteAssetCountSession(
  sessionId: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('asset_count_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    return { success: false, data: null, error: `Failed to delete session: ${error.message}` };
  }

  return { success: true, data: undefined, error: null };
}

// ============================================================================
// Asset Count Item Functions
// ============================================================================

/**
 * Create an asset count item (scanned asset).
 */
export async function createAssetCountItem(
  input: CreateAssetCountItemInput
): Promise<ServiceResult<AssetCountItem>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('asset_count_items')
    .insert({
      session_id: input.sessionId,
      asset_id: input.assetId,
      combination_id: input.combinationId ?? null,
      combination_position: input.combinationPosition ?? null,
    })
    .select()
    .single();

  if (error) {
    // Handle duplicate asset error gracefully
    if (error.code === '23505') {
      return { success: false, data: null, error: 'Asset already counted in this session' };
    }
    return { success: false, data: null, error: `Failed to create item: ${error.message}` };
  }

  return { success: true, data: mapRowToAssetCountItem(data as AssetCountItemRow), error: null };
}

/**
 * Get all items for a session.
 */
export async function getSessionItems(
  sessionId: string
): Promise<ServiceResult<AssetCountItem[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('asset_count_items')
    .select('*')
    .eq('session_id', sessionId)
    .order('scanned_at', { ascending: true });

  if (error) {
    return { success: false, data: null, error: `Failed to get items: ${error.message}` };
  }

  const items = (data as AssetCountItemRow[]).map(mapRowToAssetCountItem);
  return { success: true, data: items, error: null };
}

/**
 * Update an item's combination assignment.
 */
export async function updateAssetCountItem(
  itemId: string,
  combinationId: string | null,
  combinationPosition: number | null
): Promise<ServiceResult<AssetCountItem>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('asset_count_items')
    .update({
      combination_id: combinationId,
      combination_position: combinationPosition,
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: `Failed to update item: ${error.message}` };
  }

  return { success: true, data: mapRowToAssetCountItem(data as AssetCountItemRow), error: null };
}

/**
 * Delete an asset count item.
 */
export async function deleteAssetCountItem(
  itemId: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('asset_count_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    return { success: false, data: null, error: `Failed to delete item: ${error.message}` };
  }

  return { success: true, data: undefined, error: null };
}

// ============================================================================
// Combination Metadata Functions
// ============================================================================

/**
 * Create or update combination metadata (notes).
 */
export async function upsertCombinationMetadata(
  input: CreateCombinationMetadataInput
): Promise<ServiceResult<CombinationMetadata>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('asset_count_combination_metadata')
    .upsert({
      session_id: input.sessionId,
      combination_id: input.combinationId,
      notes: input.notes,
    }, {
      onConflict: 'session_id,combination_id',
    })
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: `Failed to save metadata: ${error.message}` };
  }

  return { success: true, data: mapRowToCombinationMetadata(data as CombinationMetadataRow), error: null };
}

/**
 * Get combination metadata for a session.
 */
export async function getSessionCombinationMetadata(
  sessionId: string
): Promise<ServiceResult<CombinationMetadata[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('asset_count_combination_metadata')
    .select('*')
    .eq('session_id', sessionId);

  if (error) {
    return { success: false, data: null, error: `Failed to get metadata: ${error.message}` };
  }

  const metadata = (data as CombinationMetadataRow[]).map(mapRowToCombinationMetadata);
  return { success: true, data: metadata, error: null };
}

// ============================================================================
// Combination Photo Functions
// ============================================================================

/**
 * Link a photo to a combination.
 */
export async function createCombinationPhoto(
  input: CreateCombinationPhotoInput
): Promise<ServiceResult<CombinationPhoto>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('asset_count_combination_photos')
    .insert({
      session_id: input.sessionId,
      combination_id: input.combinationId,
      photo_id: input.photoId,
    })
    .select()
    .single();

  if (error) {
    // Handle duplicate errors gracefully
    if (error.code === '23505') {
      return { success: false, data: null, error: 'Combination already has a photo' };
    }
    return { success: false, data: null, error: `Failed to link photo: ${error.message}` };
  }

  return { success: true, data: mapRowToCombinationPhoto(data as CombinationPhotoRow), error: null };
}

/**
 * Get combination photos for a session.
 */
export async function getSessionCombinationPhotos(
  sessionId: string
): Promise<ServiceResult<CombinationPhoto[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('asset_count_combination_photos')
    .select('*')
    .eq('session_id', sessionId);

  if (error) {
    return { success: false, data: null, error: `Failed to get photos: ${error.message}` };
  }

  const photos = (data as CombinationPhotoRow[]).map(mapRowToCombinationPhoto);
  return { success: true, data: photos, error: null };
}

/**
 * Delete a combination photo link.
 */
export async function deleteCombinationPhoto(
  sessionId: string,
  combinationId: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('asset_count_combination_photos')
    .delete()
    .eq('session_id', sessionId)
    .eq('combination_id', combinationId);

  if (error) {
    return { success: false, data: null, error: `Failed to delete photo link: ${error.message}` };
  }

  return { success: true, data: undefined, error: null };
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Submit a complete asset count session with all items, metadata, and photo links.
 * This is the primary function for submitting a count from the mobile app.
 */
export async function submitAssetCount(
  input: SubmitAssetCountInput
): Promise<ServiceResult<AssetCountSession>> {
  // Validate input
  const parsed = SubmitAssetCountInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, data: null, error: 'Invalid count data. Please try again.' };
  }

  // Create session first
  const sessionResult = await createAssetCountSession({
    depotId: input.depotId,
    countedBy: input.countedBy,
  });

  if (!sessionResult.success) {
    return sessionResult;
  }

  const sessionId = sessionResult.data.id;

  try {
    // Bulk insert items via RPC (atomic, with duplicate handling)
    const supabase = getSupabaseClient();
    try {
      const rpcItems = input.items.map((item) => ({
        asset_id: item.assetId,
        combination_id: item.combinationId ?? null,
        combination_position: item.combinationPosition,
      }));

      const { data: insertedCount, error: rpcError } = await supabase.rpc('submit_asset_count_items', {
        p_session_id: sessionId,
        p_items: rpcItems,
      });

      if (rpcError) throw rpcError;

      if (typeof insertedCount === 'number' && insertedCount < input.items.length) {
        // Some items were duplicates — warn but don't fail
        console.warn(`${input.items.length - insertedCount} duplicate items skipped`);
      }
    } catch (rpcError) {
      // Fallback to bulk insert if RPC not available
      console.warn('RPC unavailable, falling back to bulk insert:', rpcError);
      const bulkRows = input.items.map((item) => ({
        session_id: sessionId,
        asset_id: item.assetId,
        combination_id: item.combinationId ?? null,
        combination_position: item.combinationPosition ?? null,
      }));

      const { error: bulkError } = await supabase
        .from('asset_count_items')
        .insert(bulkRows);

      if (bulkError) {
        await cancelAssetCountSession(sessionId);
        return { success: false, data: null, error: `Failed to insert items: ${bulkError.message}` };
      }
    }

    // Create combination metadata and photo links in parallel
    const comboPromises: Promise<ServiceResult<unknown>>[] = [];
    for (const combo of input.combinations) {
      if (combo.notes) {
        comboPromises.push(upsertCombinationMetadata({
          sessionId,
          combinationId: combo.combinationId,
          notes: combo.notes,
        }));
      }
      if (combo.photoId) {
        comboPromises.push(createCombinationPhoto({
          sessionId,
          combinationId: combo.combinationId,
          photoId: combo.photoId,
        }));
      }
    }

    if (comboPromises.length > 0) {
      const settled = await Promise.allSettled(comboPromises);
      const failed = settled.find(
        r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      );
      if (failed) {
        await cancelAssetCountSession(sessionId);
        const errorMsg = failed.status === 'rejected'
          ? String(failed.reason)
          : (failed.status === 'fulfilled' && !failed.value.success ? failed.value.error : 'Unknown error');
        return { success: false, data: null, error: errorMsg };
      }
    }

    // Complete the session
    return completeAssetCountSession(sessionId, input.sessionNotes);
  } catch (error) {
    // Cancel session on any unexpected error
    await cancelAssetCountSession(sessionId);
    const message = error instanceof Error ? error.message : 'Failed to submit count';
    return { success: false, data: null, error: message };
  }
}

// ============================================================================
// List / Query Functions (for Count History)
// ============================================================================

export interface ListAssetCountSessionsParams {
  depotId?: string;
  status?: AssetCountSessionStatus;
  page?: number;
  pageSize?: number;
}

/** Session row with joined counter and depot names */
interface SessionListRow extends AssetCountSessionRow {
  counter: { full_name: string } | null;
  depot: { name: string; code: string } | null;
}

/** Session with resolved display names */
export interface AssetCountSessionWithNames extends AssetCountSession {
  counterName: string | null;
  depotName: string | null;
  depotCode: string | null;
}

/**
 * List asset count sessions with optional depot filter and pagination.
 * Defaults to completed sessions, ordered newest-first.
 */
export async function listAssetCountSessions(
  params: ListAssetCountSessionsParams = {}
): Promise<ServiceResult<PaginatedResult<AssetCountSessionWithNames>>> {
  const {
    depotId,
    status = 'completed',
    page = 1,
    pageSize = 20,
  } = params;

  const supabase = getSupabaseClient();
  const from = (page - 1) * pageSize;

  let query = supabase
    .from('asset_count_sessions')
    .select(
      '*, counter:counted_by(full_name), depot:depot_id(name, code)'
    );

  if (depotId) {
    query = query.eq('depot_id', depotId);
  }

  query = query
    .eq('status', status)
    .order('started_at', { ascending: false })
    .range(from, from + pageSize);

  const { data, error } = await query;

  if (error) {
    return { success: false, data: null, error: `Failed to list sessions: ${error.message}` };
  }

  const rows = (data || []) as SessionListRow[];
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

  const sessions: AssetCountSessionWithNames[] = pageRows.map((row) => {
    const { counter, depot, ...sessionRow } = row;
    const session = mapRowToAssetCountSession(sessionRow as AssetCountSessionRow);
    return {
      ...session,
      counterName: counter?.full_name ?? null,
      depotName: depot?.name ?? null,
      depotCode: depot?.code ?? null,
    };
  });

  // Estimate total from current page position
  const estimatedTotal = hasMore ? (page * pageSize) + 1 : ((page - 1) * pageSize) + pageRows.length;

  return {
    success: true,
    data: {
      data: sessions,
      total: estimatedTotal,
      page,
      pageSize,
      totalPages: hasMore ? page + 1 : page,
    },
    error: null,
  };
}

/** Item row with joined asset details */
interface ItemWithAssetRow extends AssetCountItemRow {
  asset: { asset_number: string; category: string } | null;
}

/** Count item with resolved asset display data */
export interface AssetCountItemWithAsset extends AssetCountItem {
  assetNumber: string | null;
  assetCategory: string | null;
}

/**
 * Get all items for a session with joined asset details (number + category).
 */
export async function getSessionItemsWithAssets(
  sessionId: string
): Promise<ServiceResult<AssetCountItemWithAsset[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('asset_count_items')
    .select('*, asset:asset_id(asset_number, category)')
    .eq('session_id', sessionId)
    .order('scanned_at', { ascending: true });

  if (error) {
    return { success: false, data: null, error: `Failed to get items: ${error.message}` };
  }

  const items: AssetCountItemWithAsset[] = ((data || []) as ItemWithAssetRow[]).map((row) => {
    const { asset, ...itemRow } = row;
    const item = mapRowToAssetCountItem(itemRow as AssetCountItemRow);
    return {
      ...item,
      assetNumber: asset?.asset_number ?? null,
      assetCategory: asset?.category ?? null,
    };
  });

  return { success: true, data: items, error: null };
}

// ============================================================================
// Session Summary
// ============================================================================

export interface AssetCountSummary {
  session: AssetCountSession;
  items: AssetCountItem[];
  combinationMetadata: CombinationMetadata[];
  combinationPhotos: CombinationPhoto[];
}

/**
 * Get a complete summary of a count session.
 */
export async function getAssetCountSummary(
  sessionId: string
): Promise<ServiceResult<AssetCountSummary>> {
  const [sessionResult, itemsResult, metadataResult, photosResult] = await Promise.all([
    getAssetCountSession(sessionId),
    getSessionItems(sessionId),
    getSessionCombinationMetadata(sessionId),
    getSessionCombinationPhotos(sessionId),
  ]);

  if (!sessionResult.success) {
    return { success: false, data: null, error: sessionResult.error };
  }

  if (!itemsResult.success) {
    return { success: false, data: null, error: itemsResult.error };
  }

  if (!metadataResult.success) {
    return { success: false, data: null, error: metadataResult.error };
  }

  if (!photosResult.success) {
    return { success: false, data: null, error: photosResult.error };
  }

  return {
    success: true,
    data: {
      session: sessionResult.data,
      items: itemsResult.data,
      combinationMetadata: metadataResult.data,
      combinationPhotos: photosResult.data,
    },
    error: null,
  };
}
