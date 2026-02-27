import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client configuration
 *
 * For React Native, pass `storage` (AsyncStorage) and set
 * `detectSessionInUrl: false` to avoid browser-only APIs.
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  /** Custom session storage (pass AsyncStorage for React Native) */
  storage?: { getItem: (key: string) => string | null | Promise<string | null>; setItem: (key: string, value: string) => void | Promise<void>; removeItem: (key: string) => void | Promise<void> };
  /** Set to false for React Native (default: true for web) */
  detectSessionInUrl?: boolean;
}

/**
 * Singleton Supabase client instance
 */
let supabaseClient: SupabaseClient | null = null;
let currentConfig: SupabaseConfig | null = null;

/**
 * Initialize the Supabase client with configuration
 *
 * @param config - Supabase URL and anon key
 * @returns Configured Supabase client
 *
 * @example
 * ```typescript
 * initSupabase({
 *   url: process.env.SUPABASE_URL,
 *   anonKey: process.env.SUPABASE_ANON_KEY,
 * });
 * ```
 */
export function initSupabase(config: SupabaseConfig): SupabaseClient {
  // Return existing client if already initialized
  if (supabaseClient) return supabaseClient;

  if (!config.url || !config.anonKey) {
    throw new Error(
      'Supabase configuration missing. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set.'
    );
  }

  // Validate URL format
  try {
    new URL(config.url);
  } catch {
    throw new Error(`Invalid SUPABASE_URL: ${config.url}`);
  }

  currentConfig = config;
  supabaseClient = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: config.detectSessionInUrl ?? true,
      ...(config.storage ? { storage: config.storage } : {}),
    },
    global: {
      headers: {
        'X-Client-Info': '@rgr/shared',
      },
    },
    // Connection pooling settings for better performance
    db: {
      schema: 'public',
    },
  });

  return supabaseClient;
}

/**
 * Get the Supabase client instance
 *
 * @throws Error if client not initialized
 * @returns Supabase client
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error(
      'Supabase client not initialized. Call initSupabase() first.'
    );
  }
  return supabaseClient;
}

/**
 * Get the current Supabase configuration
 *
 * @throws Error if not initialized
 * @returns Current configuration
 */
export function getSupabaseConfig(): SupabaseConfig {
  if (!currentConfig) {
    throw new Error('Supabase not configured. Call initSupabase() first.');
  }
  return currentConfig;
}

/**
 * Check if Supabase client is initialized
 */
export function isSupabaseInitialized(): boolean {
  return supabaseClient !== null;
}

/**
 * Reset the Supabase client (useful for testing)
 */
export function resetSupabaseClient(): void {
  supabaseClient = null;
  currentConfig = null;
}

/**
 * Type helper for Supabase queries
 * Returns a typed table reference for query building
 */
export function getTable<T extends string>(tableName: T) {
  return getSupabaseClient().from(tableName);
}

// Re-export types from supabase-js
export type { SupabaseClient } from '@supabase/supabase-js';
