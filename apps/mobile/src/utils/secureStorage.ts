import * as SecureStore from 'expo-secure-store';

const KEYS = {
  SESSION: 'rgr_session',
  AUTO_LOGIN_ENABLED: 'rgr_auto_login_enabled',
} as const;

/**
 * Session data stored securely on device
 * Contains only tokens, never passwords
 */
export interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

/**
 * Save session tokens to secure storage
 * Never stores passwords - only access and refresh tokens
 */
export async function saveSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify(session));
  await SecureStore.setItemAsync(KEYS.AUTO_LOGIN_ENABLED, 'true');
}

/**
 * Retrieve stored session tokens
 */
export async function getSession(): Promise<StoredSession | null> {
  const sessionStr = await SecureStore.getItemAsync(KEYS.SESSION);
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr) as StoredSession;
  } catch {
    return null;
  }
}

/**
 * Clear session tokens from secure storage
 * Called on logout or when session is invalid
 */
export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.SESSION);
  await SecureStore.deleteItemAsync(KEYS.AUTO_LOGIN_ENABLED);
}

/**
 * Check if auto-login is enabled
 */
export async function isAutoLoginEnabled(): Promise<boolean> {
  const enabled = await SecureStore.getItemAsync(KEYS.AUTO_LOGIN_ENABLED);
  return enabled === 'true';
}
