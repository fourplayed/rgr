import * as SecureStore from 'expo-secure-store';
import {
  saveSession,
  getSession,
  clearSession,
  isAutoLoginEnabled,
  setAutoLoginEnabled,
} from '../secureStorage';
import type { StoredSession } from '../secureStorage';

const validSession: StoredSession = {
  access_token: 'tok_abc',
  refresh_token: 'ref_xyz',
  expires_at: 1700000000,
};

describe('secureStorage', () => {
  beforeEach(() => {
    // Clear the in-memory secure store between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = (SecureStore as any)['__store'] as Map<string, string> | undefined;
    if (store) store.clear();
  });

  it('saveSession stores JSON and sets auto-login flag', async () => {
    await saveSession(validSession);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'rgr_session',
      JSON.stringify(validSession)
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('rgr_auto_login_enabled', 'true');
  });

  it('getSession returns stored session', async () => {
    await saveSession(validSession);
    const result = await getSession();
    expect(result).toEqual(validSession);
  });

  it('getSession returns null when empty', async () => {
    const result = await getSession();
    expect(result).toBeNull();
  });

  it('getSession returns null for non-JSON data', async () => {
    await SecureStore.setItemAsync('rgr_session', 'not-json');
    const result = await getSession();
    expect(result).toBeNull();
  });

  it('getSession returns null when type guard fails (missing access_token)', async () => {
    await SecureStore.setItemAsync('rgr_session', JSON.stringify({ refresh_token: 'ref_xyz' }));
    const result = await getSession();
    expect(result).toBeNull();
  });

  it('getSession accepts optional expires_at as undefined', async () => {
    const session: StoredSession = {
      access_token: 'tok_abc',
      refresh_token: 'ref_xyz',
    };
    await saveSession(session);
    const result = await getSession();
    expect(result).toEqual(session);
  });

  it('clearSession removes session and auto-login flag', async () => {
    await saveSession(validSession);
    await clearSession();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('rgr_session');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('rgr_auto_login_enabled');

    const result = await getSession();
    expect(result).toBeNull();
  });

  it('isAutoLoginEnabled is true after save, false after clear', async () => {
    await saveSession(validSession);
    expect(await isAutoLoginEnabled()).toBe(true);

    await clearSession();
    expect(await isAutoLoginEnabled()).toBe(false);
  });

  it('setAutoLoginEnabled(false) clears both keys', async () => {
    await saveSession(validSession);
    await setAutoLoginEnabled(false);

    expect(await isAutoLoginEnabled()).toBe(false);
    expect(await getSession()).toBeNull();
  });

  it('setAutoLoginEnabled(true) sets flag only', async () => {
    await setAutoLoginEnabled(true);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('rgr_auto_login_enabled', 'true');
    // Session should not have been set
    expect(await getSession()).toBeNull();
  });

  it('saveSession handles SecureStore throw (keychain locked)', async () => {
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('Keychain locked'));

    await expect(saveSession(validSession)).rejects.toThrow('Keychain locked');
  });

  it('getSession returns null when SecureStore throws (keychain locked)', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('Keychain unavailable'));

    // getItemAsync failure is now caught and returns null instead of propagating
    const result = await getSession();
    expect(result).toBeNull();
  });

  it('isAutoLoginEnabled returns false when SecureStore throws', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('Keychain locked'));

    const result = await isAutoLoginEnabled();
    expect(result).toBe(false);
  });
});
