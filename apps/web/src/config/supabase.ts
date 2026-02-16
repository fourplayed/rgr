/**
 * Supabase Configuration for Web App
 *
 * SECURITY: Environment variables are validated at runtime
 * Credentials are loaded from .env file (not committed to git)
 */

import { initSupabase, type SupabaseConfig } from '@rgr/shared';

/**
 * Load and validate Supabase configuration from environment variables
 *
 * @throws Error if required environment variables are missing
 */
export function getSupabaseConfig(): SupabaseConfig {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase configuration. ' +
      'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env file.'
    );
  }

  // Basic validation
  if (!url.startsWith('https://')) {
    throw new Error('VITE_SUPABASE_URL must be a valid HTTPS URL');
  }

  if (anonKey.length < 100) {
    throw new Error('VITE_SUPABASE_ANON_KEY appears to be invalid (too short)');
  }

  return { url, anonKey };
}

/**
 * Initialize Supabase client for the web app
 * Should be called once at application startup
 *
 * @returns Configured Supabase client
 */
export function initializeSupabase() {
  try {
    const config = getSupabaseConfig();
    const client = initSupabase(config);

    console.log('[Supabase] Client initialized successfully');
    console.log('[Supabase] Project URL:', config.url);

    return client;
  } catch (error) {
    console.error('[Supabase] Initialization failed:', error);
    throw error;
  }
}
