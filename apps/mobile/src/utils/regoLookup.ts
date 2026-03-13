import { getSupabaseClient } from '@rgr/shared';

/**
 * Trigger a registration lookup via the rego-lookup edge function.
 * Fire-and-forget — errors are logged but not thrown.
 */
export async function triggerRegoLookup(assetId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    // Get the asset's registration number
    const { data: asset } = await supabase
      .from('assets')
      .select('registration_number')
      .eq('id', assetId)
      .single();

    if (!asset?.registration_number) return;

    const { error } = await supabase.functions.invoke('rego-lookup', {
      body: { registrationNumber: asset.registration_number, assetId },
    });

    if (error && __DEV__) {
      console.warn(`[RegoLookup] Edge function error: ${error.message}`);
    }
  } catch (err: unknown) {
    console.warn('[RegoLookup] Fire-and-forget failed:', err);
  }
}
