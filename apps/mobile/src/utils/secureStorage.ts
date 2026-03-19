import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

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
 * Runtime type guard for parsed session data.
 * Defends against corrupted or tampered secure storage values.
 */
function isStoredSession(obj: unknown): obj is StoredSession {
  if (typeof obj !== 'object' || obj === null) return false;
  const s = obj as Record<string, unknown>;
  return (
    typeof s['access_token'] === 'string' &&
    typeof s['refresh_token'] === 'string' &&
    (s['expires_at'] === undefined || typeof s['expires_at'] === 'number')
  );
}

/**
 * Retrieve stored session tokens
 */
export async function getSession(): Promise<StoredSession | null> {
  let sessionStr: string | null;
  try {
    sessionStr = await SecureStore.getItemAsync(KEYS.SESSION);
  } catch (err) {
    logger.warn('SecureStore read failed (keychain may be locked)', err);
    return null;
  }
  if (!sessionStr) return null;
  try {
    const parsed: unknown = JSON.parse(sessionStr);
    if (!isStoredSession(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clear session tokens from secure storage
 * Called on logout or when session is invalid
 */
export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEYS.SESSION);
    await SecureStore.deleteItemAsync(KEYS.AUTO_LOGIN_ENABLED);
  } catch (err) {
    logger.warn('SecureStore delete failed during session clear', err);
  }
}

/**
 * Check if auto-login is enabled
 */
export async function isAutoLoginEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(KEYS.AUTO_LOGIN_ENABLED);
    return enabled === 'true';
  } catch (err) {
    logger.warn('SecureStore read failed for auto-login check', err);
    return false;
  }
}

/**
 * Enable or disable auto-login
 * Does not clear session tokens - just controls whether they're used
 */
export async function setAutoLoginEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(KEYS.AUTO_LOGIN_ENABLED, 'true');
  } else {
    await SecureStore.deleteItemAsync(KEYS.AUTO_LOGIN_ENABLED);
    await SecureStore.deleteItemAsync(KEYS.SESSION);
  }
}
