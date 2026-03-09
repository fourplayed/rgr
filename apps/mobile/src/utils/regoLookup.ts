import Constants from 'expo-constants';
import { getSupabaseClient } from '@rgr/shared';

/**
 * Trigger a registration lookup via the rego-lookup edge function.
 * Fire-and-forget — errors are logged but not thrown.
 */
export async function triggerRegoLookup(assetId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    // Get the current session for auth
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const supabaseUrl =
      Constants.expoConfig?.extra?.['supabaseUrl'] ||
      process.env['EXPO_PUBLIC_SUPABASE_URL'];

    if (!supabaseUrl) return;

    // Get the asset's registration number
    const { data: asset } = await supabase
      .from('assets')
      .select('registration_number')
      .eq('id', assetId)
      .single();

    if (!asset?.registration_number) return;

    await fetch(`${supabaseUrl}/functions/v1/rego-lookup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registrationNumber: asset.registration_number,
        assetId,
      }),
    });
  } catch (err) {
    console.warn('[RegoLookup] Fire-and-forget failed:', err);
  }
}
