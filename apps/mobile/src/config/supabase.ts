import AsyncStorage from '@react-native-async-storage/async-storage';
import { initSupabase } from '@rgr/shared';
import Constants from 'expo-constants';

/**
 * Initialize Supabase client for React Native
 * Uses AsyncStorage for session persistence
 * Disables URL-based session detection (not applicable for RN)
 */
export function initializeMobileSupabase() {
  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase URL and Anon Key are required. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
    );
  }

  initSupabase({
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    storage: AsyncStorage,
    detectSessionInUrl: false,
  });
}
