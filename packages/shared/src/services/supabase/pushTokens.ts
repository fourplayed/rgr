import { getSupabaseClient } from './client';
import type { ServiceResult } from '../../types';
import type { UserRole } from '../../types/enums';
import type { PushToken, PushTokenRow, CreatePushTokenInput } from '../../types/entities/pushToken';
import { mapRowToPushToken, CreatePushTokenInputSchema } from '../../types/entities/pushToken';
import { assertQueryResult } from '../../utils';

/**
 * Upsert a push token by user_id + device_id.
 * Called on app mount when push permissions are granted.
 */
export async function upsertPushToken(
  input: CreatePushTokenInput
): Promise<ServiceResult<PushToken>> {
  const parsed = CreatePushTokenInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      data: null,
      error: parsed.error.errors[0]?.message ?? 'Invalid input',
    };
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: parsed.data.userId,
        token: parsed.data.token,
        device_id: parsed.data.deviceId,
        platform: parsed.data.platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,device_id' }
    )
    .select()
    .single();

  if (error) {
    return { success: false, data: null, error: `Failed to upsert push token: ${error.message}` };
  }

  return {
    success: true,
    data: mapRowToPushToken(assertQueryResult<PushTokenRow>(data)),
    error: null,
  };
}

/**
 * Delete a push token by user ID and device ID.
 */
export async function deletePushToken(
  userId: string,
  deviceId: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('device_id', deviceId);

  if (error) {
    return { success: false, data: null, error: `Failed to delete push token: ${error.message}` };
  }

  return { success: true, data: undefined, error: null };
}

/**
 * Get all push tokens for users with a specific role.
 * Uses a two-step query since push_tokens.user_id references auth.users,
 * not profiles directly (no FK for Supabase join).
 * Requires service_role access (used by edge functions).
 */
export async function getPushTokensForRole(role: UserRole): Promise<ServiceResult<PushToken[]>> {
  const supabase = getSupabaseClient();

  // Step 1: Get user IDs for the given role
  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', role)
    .eq('is_active', true);

  if (profileError) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch profiles for role: ${profileError.message}`,
    };
  }

  const userIds = (profileRows || []).map((p) => p.id);
  if (userIds.length === 0) {
    return { success: true, data: [], error: null };
  }

  // Step 2: Get push tokens for those users
  const { data: tokenRows, error: tokenError } = await supabase
    .from('push_tokens')
    .select('*')
    .in('user_id', userIds);

  if (tokenError) {
    return {
      success: false,
      data: null,
      error: `Failed to fetch push tokens: ${tokenError.message}`,
    };
  }

  const tokens = (tokenRows || []).map((row) =>
    mapRowToPushToken(assertQueryResult<PushTokenRow>(row))
  );

  return { success: true, data: tokens, error: null };
}
