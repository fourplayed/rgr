import type { Profile } from '@rgr/shared';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any import that triggers the store module
// ---------------------------------------------------------------------------

const mockSetSession = jest.fn();
const mockSupabaseSignOut = jest.fn();

jest.mock('@rgr/shared', () => ({
  signInWithEmailSecure: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  fetchProfile: jest.fn(),
  updateProfile: jest.fn(),
  updateLastLogin: jest.fn(),
  getSupabaseClient: jest.fn(() => ({
    auth: {
      setSession: mockSetSession,
      signOut: mockSupabaseSignOut,
    },
  })),
  deletePushToken: jest.fn(),
}));

jest.mock('../../utils/secureStorage', () => ({
  saveSession: jest.fn(() => Promise.resolve()),
  getSession: jest.fn(() => Promise.resolve(null)),
  clearSession: jest.fn(() => Promise.resolve()),
  isAutoLoginEnabled: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('../../utils/eventBus', () => ({
  eventBus: { emit: jest.fn(), on: jest.fn(), off: jest.fn() },
  AppEvents: { USER_LOGOUT: 'user:logout' },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    scan: jest.fn(),
  },
}));

jest.mock('expo-application', () => ({
  getAndroidId: jest.fn(() => 'android-device-id'),
  getIosIdForVendorAsync: jest.fn(() => Promise.resolve('ios-device-id')),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  signInWithEmailSecure,
  signOut,
  getSession as getSupabaseSession,
  fetchProfile,
  updateProfile,
  updateLastLogin,
  deletePushToken,
} from '@rgr/shared';
import {
  saveSession,
  getSession as getStoredSession,
  clearSession,
  isAutoLoginEnabled,
} from '../../utils/secureStorage';
import { eventBus, AppEvents } from '../../utils/eventBus';
import { useAuthStore } from '../authStore';

// ---------------------------------------------------------------------------
// Typed mock references
// ---------------------------------------------------------------------------

const mockSignIn = signInWithEmailSecure as jest.Mock;
const mockSignOut = signOut as jest.Mock;
const mockGetSupabaseSession = getSupabaseSession as jest.Mock;
const mockFetchProfile = fetchProfile as jest.Mock;
const mockUpdateProfile = updateProfile as jest.Mock;
const mockUpdateLastLogin = updateLastLogin as jest.Mock;
const mockDeletePushToken = deletePushToken as jest.Mock;

const mockSaveSession = saveSession as jest.Mock;
const mockGetStoredSession = getStoredSession as jest.Mock;
const mockClearSession = clearSession as jest.Mock;
const mockIsAutoLoginEnabled = isAutoLoginEnabled as jest.Mock;

const mockEventBusEmit = eventBus.emit as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ACTIVE_PROFILE: Profile = {
  id: 'user-123',
  email: 'test@example.com',
  fullName: 'Test User',
  role: 'driver',
  phone: null,
  avatarUrl: null,
  isActive: true,
  employeeId: null,
  depot: null,
  lastLoginAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  notificationPreferences: { rego_expiry: true },
};

const DEACTIVATED_PROFILE: Profile = {
  ...ACTIVE_PROFILE,
  isActive: false,
};

const SIGN_IN_SUCCESS = {
  success: true,
  data: {
    user: { id: 'user-123' },
    session: {
      access_token: 'tok_abc',
      refresh_token: 'ref_xyz',
      expires_at: 9999999999,
    },
  },
  error: null,
};

const PROFILE_SUCCESS = {
  success: true,
  data: ACTIVE_PROFILE,
  error: null,
};

const PROFILE_DEACTIVATED = {
  success: true,
  data: DEACTIVATED_PROFILE,
  error: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset the Zustand store to its initial state between tests. */
function resetStore() {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isLoginInProgress: false,
    error: null,
    authError: null,
    autoLoginAttempted: false,
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    // Sane defaults — individual tests override as needed
    mockSignOut.mockResolvedValue(undefined);
    mockUpdateLastLogin.mockResolvedValue({ success: true, data: null, error: null });
    mockClearSession.mockResolvedValue(undefined);
    mockSaveSession.mockResolvedValue(undefined);
  });

  // =========================================================================
  // login
  // =========================================================================

  describe('login', () => {
    it('sets user and isAuthenticated on success', async () => {
      mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
      mockFetchProfile.mockResolvedValue(PROFILE_SUCCESS);

      const result = await useAuthStore.getState().login('test@example.com', 'password123');

      expect(result).toEqual({ success: true });
      const state = useAuthStore.getState();
      expect(state.user).toEqual(ACTIVE_PROFILE);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.isLoginInProgress).toBe(false);
      expect(state.error).toBeNull();
    });

    it('saves session tokens after successful login', async () => {
      mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
      mockFetchProfile.mockResolvedValue(PROFILE_SUCCESS);

      await useAuthStore.getState().login('test@example.com', 'password123');

      expect(mockSaveSession).toHaveBeenCalledWith({
        access_token: 'tok_abc',
        refresh_token: 'ref_xyz',
        expires_at: 9999999999,
      });
    });

    it('calls fetchProfile and updateLastLogin in parallel', async () => {
      mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
      mockFetchProfile.mockResolvedValue(PROFILE_SUCCESS);

      await useAuthStore.getState().login('test@example.com', 'password123');

      expect(mockFetchProfile).toHaveBeenCalledWith('user-123');
      expect(mockUpdateLastLogin).toHaveBeenCalledWith('user-123');
    });

    it('returns error when signInWithEmailSecure fails', async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        data: null,
        error: 'Invalid credentials',
      });

      const result = await useAuthStore.getState().login('bad@example.com', 'wrong');

      expect(result).toEqual({ success: false, error: 'Invalid credentials' });
      const state = useAuthStore.getState();
      expect(state.error).toBe('Invalid credentials');
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoginInProgress).toBe(false);
    });

    it('returns error when fetchProfile fails', async () => {
      mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
      mockFetchProfile.mockResolvedValue({
        success: false,
        data: null,
        error: 'Profile not found',
      });

      const result = await useAuthStore.getState().login('test@example.com', 'password123');

      expect(result).toEqual({ success: false, error: 'Profile not found' });
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('signs out and returns error for deactivated users', async () => {
      mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
      mockFetchProfile.mockResolvedValue(PROFILE_DEACTIVATED);

      const result = await useAuthStore.getState().login('test@example.com', 'password123');

      expect(mockSignOut).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('deactivated');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('does not save session for deactivated users', async () => {
      mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
      mockFetchProfile.mockResolvedValue(PROFILE_DEACTIVATED);

      await useAuthStore.getState().login('test@example.com', 'password123');

      expect(mockSaveSession).not.toHaveBeenCalled();
    });

    it('prevents double login when isLoginInProgress is true', async () => {
      useAuthStore.setState({ isLoginInProgress: true });

      const result = await useAuthStore.getState().login('test@example.com', 'password123');

      expect(result).toEqual({ success: false, error: 'Login in progress' });
      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it('handles unexpected exceptions gracefully', async () => {
      mockSignIn.mockRejectedValue(new Error('Network failure'));

      const result = await useAuthStore.getState().login('test@example.com', 'password123');

      expect(result).toEqual({ success: false, error: 'Network failure' });
      const state = useAuthStore.getState();
      expect(state.error).toBe('Network failure');
      expect(state.isLoading).toBe(false);
      expect(state.isLoginInProgress).toBe(false);
    });

    it('handles non-Error exceptions with fallback message', async () => {
      mockSignIn.mockRejectedValue('string-error');

      const result = await useAuthStore.getState().login('test@example.com', 'password123');

      expect(result).toEqual({ success: false, error: 'Login failed' });
    });

    it('omits expires_at from saved session when undefined', async () => {
      const signInNoExpiry = {
        ...SIGN_IN_SUCCESS,
        data: {
          ...SIGN_IN_SUCCESS.data,
          session: {
            access_token: 'tok_abc',
            refresh_token: 'ref_xyz',
            // no expires_at
          },
        },
      };
      mockSignIn.mockResolvedValue(signInNoExpiry);
      mockFetchProfile.mockResolvedValue(PROFILE_SUCCESS);

      await useAuthStore.getState().login('test@example.com', 'password123');

      expect(mockSaveSession).toHaveBeenCalledWith({
        access_token: 'tok_abc',
        refresh_token: 'ref_xyz',
      });
    });

    it('does not block if updateLastLogin fails', async () => {
      mockSignIn.mockResolvedValue(SIGN_IN_SUCCESS);
      mockFetchProfile.mockResolvedValue(PROFILE_SUCCESS);
      mockUpdateLastLogin.mockRejectedValue(new Error('DB timeout'));

      const result = await useAuthStore.getState().login('test@example.com', 'password123');

      // Login should still succeed; updateLastLogin failure is swallowed
      expect(result).toEqual({ success: true });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  // =========================================================================
  // logout
  // =========================================================================

  describe('logout', () => {
    beforeEach(() => {
      // Start logged in
      useAuthStore.setState({
        user: ACTIVE_PROFILE,
        isAuthenticated: true,
        isLoading: false,
      });
    });

    it('clears user state', async () => {
      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
      expect(state.authError).toBeNull();
      expect(state.autoLoginAttempted).toBe(false);
    });

    it('clears saved session', async () => {
      await useAuthStore.getState().logout();

      expect(mockClearSession).toHaveBeenCalled();
    });

    it('emits USER_LOGOUT event', async () => {
      await useAuthStore.getState().logout();

      expect(mockEventBusEmit).toHaveBeenCalledWith(AppEvents.USER_LOGOUT);
    });

    it('gracefully handles push token cleanup failure (dynamic import limitation)', async () => {
      // In the Jest environment, dynamic import('expo-application') throws
      // (requires --experimental-vm-modules). This exercises the catch branch
      // inside logout's push token cleanup block. Verify the error is swallowed
      // and logout still completes successfully.
      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      // signOut is still called after the push cleanup catch
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('does not attempt push token cleanup when no user', async () => {
      useAuthStore.setState({ user: null });

      await useAuthStore.getState().logout();

      expect(mockDeletePushToken).not.toHaveBeenCalled();
    });

    it('calls signOut (best-effort)', async () => {
      await useAuthStore.getState().logout();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('does not fail if signOut throws', async () => {
      mockSignOut.mockRejectedValue(new Error('signOut network error'));

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // =========================================================================
  // checkAuth
  // =========================================================================

  describe('checkAuth', () => {
    it('restores authenticated state from Supabase session', async () => {
      mockGetSupabaseSession.mockResolvedValue({
        success: true,
        data: { user: { id: 'user-123' } },
        error: null,
      });
      mockFetchProfile.mockResolvedValue(PROFILE_SUCCESS);

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(ACTIVE_PROFILE);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('clears auth when no session exists', async () => {
      mockGetSupabaseSession.mockResolvedValue({
        success: true,
        data: null,
        error: null,
      });

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('clears auth when getSession fails', async () => {
      mockGetSupabaseSession.mockResolvedValue({
        success: false,
        data: null,
        error: 'Session error',
      });

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('clears auth when fetchProfile fails', async () => {
      mockGetSupabaseSession.mockResolvedValue({
        success: true,
        data: { user: { id: 'user-123' } },
        error: null,
      });
      mockFetchProfile.mockResolvedValue({
        success: false,
        data: null,
        error: 'Profile error',
      });

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('signs out and clears session for deactivated users', async () => {
      mockGetSupabaseSession.mockResolvedValue({
        success: true,
        data: { user: { id: 'user-123' } },
        error: null,
      });
      mockFetchProfile.mockResolvedValue(PROFILE_DEACTIVATED);

      await useAuthStore.getState().checkAuth();

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockClearSession).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('handles unexpected exceptions gracefully', async () => {
      mockGetSupabaseSession.mockRejectedValue(new Error('Network down'));

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  // =========================================================================
  // attemptAutoLogin
  // =========================================================================

  describe('attemptAutoLogin', () => {
    const FUTURE_EXPIRY = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    const STORED_SESSION = {
      access_token: 'tok_stored',
      refresh_token: 'ref_stored',
      expires_at: FUTURE_EXPIRY,
    };

    const SET_SESSION_SUCCESS = {
      data: {
        session: {
          access_token: 'tok_refreshed',
          refresh_token: 'ref_refreshed',
          expires_at: FUTURE_EXPIRY + 3600,
        },
        user: { id: 'user-123' },
      },
      error: null,
    };

    it('returns true and restores auth on success', async () => {
      mockIsAutoLoginEnabled.mockResolvedValue(true);
      mockGetStoredSession.mockResolvedValue(STORED_SESSION);
      mockSetSession.mockResolvedValue(SET_SESSION_SUCCESS);
      mockFetchProfile.mockResolvedValue(PROFILE_SUCCESS);

      const result = await useAuthStore.getState().attemptAutoLogin();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.user).toEqual(ACTIVE_PROFILE);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.isLoginInProgress).toBe(false);
    });

    it('saves refreshed session tokens', async () => {
      mockIsAutoLoginEnabled.mockResolvedValue(true);
      mockGetStoredSession.mockResolvedValue(STORED_SESSION);
      mockSetSession.mockResolvedValue(SET_SESSION_SUCCESS);
      mockFetchProfile.mockResolvedValue(PROFILE_SUCCESS);

      await useAuthStore.getState().attemptAutoLogin();

      expect(mockSaveSession).toHaveBeenCalledWith({
        access_token: 'tok_refreshed',
        refresh_token: 'ref_refreshed',
        expires_at: FUTURE_EXPIRY + 3600,
      });
    });

    it('returns false when auto-login is disabled', async () => {
      mockIsAutoLoginEnabled.mockResolvedValue(false);

      const result = await useAuthStore.getState().attemptAutoLogin();

      expect(result).toBe(false);
      expect(mockGetStoredSession).not.toHaveBeenCalled();
    });

    it('returns false when no stored session', async () => {
      mockIsAutoLoginEnabled.mockResolvedValue(true);
      mockGetStoredSession.mockResolvedValue(null);

      const result = await useAuthStore.getState().attemptAutoLogin();

      expect(result).toBe(false);
    });

    it('rejects tokens missing expires_at and clears session', async () => {
      mockIsAutoLoginEnabled.mockResolvedValue(true);
      mockGetStoredSession.mockResolvedValue({
        access_token: 'tok_stored',
        refresh_token: 'ref_stored',
        // no expires_at
      });

      const result = await useAuthStore.getState().attemptAutoLogin();

      expect(result).toBe(false);
      expect(mockClearSession).toHaveBeenCalled();
      expect(useAuthStore.getState().authError).toBe('Session expired. Please log in again.');
    });

    it('rejects expired tokens (past expiry + 5min buffer)', async () => {
      const expiredAt = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      mockIsAutoLoginEnabled.mockResolvedValue(true);
      mockGetStoredSession.mockResolvedValue({
        access_token: 'tok_stored',
        refresh_token: 'ref_stored',
        expires_at: expiredAt,
      });

      const result = await useAuthStore.getState().attemptAutoLogin();

      expect(result).toBe(false);
      expect(mockClearSession).toHaveBeenCalled();
      expect(useAuthStore.getState().authError).toBe('Session expired. Please log in again.');
    });

    it('rejects tokens within 5-minute expiry buffer', async () => {
      const nearExpiry = Math.floor(Date.now() / 1000) + 120; // 2 min from now (within 5min buffer)
      mockIsAutoLoginEnabled.mockResolvedValue(true);
      mockGetStoredSession.mockResolvedValue({
        access_token: 'tok_stored',
        refresh_token: 'ref_stored',
        expires_at: nearExpiry,
      });

      const result = await useAuthStore.getState().attemptAutoLogin();

      expect(result).toBe(false);
      expect(mockClearSession).toHaveBeenCalled();
    });

    it('prevents repeated attempts via autoLoginAttempted guard', async () => {
      useAuthStore.setState({ autoLoginAttempted: true });

      const result = await useAuthStore.getState().attemptAutoLogin();

      expect(result).toBe(false);
      expect(mockIsAutoLoginEnabled).not.toHaveBeenCalled();
    });

    it('clears session when setSession returns error', async () => {
      mockIsAutoLoginEnabled.mockResolvedValue(true);
      mockGetStoredSession.mockResolvedValue(STORED_SESSION);
      mockSetSession.mockResolvedValue({
        data: { session: null, user: null },
        error: new Error('Invalid refresh token'),
      });

      const result = await useAuthStore.getState().attemptAutoLogin();

      expect(result).toBe(false);
      expect(mockClearSession).toHaveBeenCalled();
      expect(useAuthStore.getState().authError).toBe('Session expired. Please log in again.');
    });

    it('clears session when fetchProfile fails after setSession', async () => {
      mockIsAutoLoginEnabled.mockResolvedValue(true);
      mockGetStoredSession.mockResolvedValue(STORED_SESSION);
      mockSetSession.mockResolvedValue(SET_SESSION_SUCCESS);
      mockFetchProfile.mockResolvedValue({
        success: false,
        data: null,
        error: 'Profile not found',
      });

      const result = await useAuthStore.getState().attemptAutoLogin();

      expect(result).toBe(false);
      expect(mockSupabaseSignOut).toHaveBeenCalled();
      expect(mockClearSession).toHaveBeenCalled();
      expect(useAuthStore.getState().authError).toBe(
        'Failed to load profile. Please log in again.'
      );
    });

    it('signs out and clears session for deactivated users', async () => {
      mockIsAutoLoginEnabled.mockResolvedValue(true);
      mockGetStoredSession.mockResolvedValue(STORED_SESSION);
      mockSetSession.mockResolvedValue(SET_SESSION_SUCCESS);
      mockFetchProfile.mockResolvedValue(PROFILE_DEACTIVATED);

      const result = await useAuthStore.getState().attemptAutoLogin();

      expect(result).toBe(false);
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockClearSession).toHaveBeenCalled();
      expect(useAuthStore.getState().authError).toContain('deactivated');
    });

    it('handles unexpected exceptions and clears session', async () => {
      mockIsAutoLoginEnabled.mockResolvedValue(true);
      mockGetStoredSession.mockRejectedValue(new Error('Keychain locked'));

      const result = await useAuthStore.getState().attemptAutoLogin();

      expect(result).toBe(false);
      expect(mockClearSession).toHaveBeenCalled();
      expect(useAuthStore.getState().authError).toBe('Session expired. Please log in again.');
    });

    it('always clears isLoading and isLoginInProgress in finally block', async () => {
      mockIsAutoLoginEnabled.mockResolvedValue(true);
      mockGetStoredSession.mockRejectedValue(new Error('fail'));

      await useAuthStore.getState().attemptAutoLogin();

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isLoginInProgress).toBe(false);
    });

    it('sets autoLoginAttempted to true even on early return', async () => {
      mockIsAutoLoginEnabled.mockResolvedValue(false);

      await useAuthStore.getState().attemptAutoLogin();

      expect(useAuthStore.getState().autoLoginAttempted).toBe(true);
    });
  });

  // =========================================================================
  // handleSessionExpired
  // =========================================================================

  describe('handleSessionExpired', () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: ACTIVE_PROFILE,
        isAuthenticated: true,
        isLoading: false,
      });
    });

    it('sets authError message', async () => {
      await useAuthStore.getState().handleSessionExpired();

      expect(useAuthStore.getState().authError).toBe('Session expired. Please log in again.');
    });

    it('clears user and auth state', async () => {
      await useAuthStore.getState().handleSessionExpired();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
      expect(state.autoLoginAttempted).toBe(false);
    });

    it('clears saved session', async () => {
      await useAuthStore.getState().handleSessionExpired();

      expect(mockClearSession).toHaveBeenCalled();
    });

    it('emits USER_LOGOUT event', async () => {
      await useAuthStore.getState().handleSessionExpired();

      expect(mockEventBusEmit).toHaveBeenCalledWith(AppEvents.USER_LOGOUT);
    });

    it('calls signOut best-effort', async () => {
      await useAuthStore.getState().handleSessionExpired();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('does not throw if signOut fails', async () => {
      mockSignOut.mockRejectedValue(new Error('Network down'));

      await useAuthStore.getState().handleSessionExpired();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // =========================================================================
  // clearSavedSession
  // =========================================================================

  describe('clearSavedSession', () => {
    it('delegates to clearSession', async () => {
      await useAuthStore.getState().clearSavedSession();

      expect(mockClearSession).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateUserProfile
  // =========================================================================

  describe('updateUserProfile', () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: ACTIVE_PROFILE,
        isAuthenticated: true,
        isLoading: false,
      });
    });

    it('calls updateProfile and updates state on success', async () => {
      const updatedProfile = { ...ACTIVE_PROFILE, fullName: 'Updated Name' };
      mockUpdateProfile.mockResolvedValue({
        success: true,
        data: updatedProfile,
        error: null,
      });

      const result = await useAuthStore.getState().updateUserProfile({ fullName: 'Updated Name' });

      expect(result).toEqual({ success: true });
      expect(mockUpdateProfile).toHaveBeenCalledWith('user-123', { fullName: 'Updated Name' });
      expect(useAuthStore.getState().user).toEqual(updatedProfile);
    });

    it('returns error when not authenticated', async () => {
      useAuthStore.setState({ user: null });

      const result = await useAuthStore.getState().updateUserProfile({ fullName: 'Nope' });

      expect(result).toEqual({ success: false, error: 'Not authenticated' });
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('returns error when updateProfile fails', async () => {
      mockUpdateProfile.mockResolvedValue({
        success: false,
        data: null,
        error: 'Validation error',
      });

      const result = await useAuthStore.getState().updateUserProfile({ fullName: '' });

      expect(result).toEqual({ success: false, error: 'Validation error' });
      // User state should remain unchanged
      expect(useAuthStore.getState().user).toEqual(ACTIVE_PROFILE);
    });

    it('handles unexpected exceptions', async () => {
      mockUpdateProfile.mockRejectedValue(new Error('DB down'));

      const result = await useAuthStore.getState().updateUserProfile({ fullName: 'Fail' });

      expect(result).toEqual({ success: false, error: 'DB down' });
    });

    it('handles non-Error exceptions with fallback message', async () => {
      mockUpdateProfile.mockRejectedValue(42);

      const result = await useAuthStore.getState().updateUserProfile({ fullName: 'Fail' });

      expect(result).toEqual({ success: false, error: 'Failed to update profile' });
    });
  });

  // =========================================================================
  // clearError / clearAuthError / setAuthError
  // =========================================================================

  describe('clearError', () => {
    it('clears the error field', () => {
      useAuthStore.setState({ error: 'Something went wrong' });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('clearAuthError', () => {
    it('clears the authError field', () => {
      useAuthStore.setState({ authError: 'Session expired' });

      useAuthStore.getState().clearAuthError();

      expect(useAuthStore.getState().authError).toBeNull();
    });
  });

  describe('setAuthError', () => {
    it('sets authError to the given string', () => {
      useAuthStore.getState().setAuthError('Custom error');

      expect(useAuthStore.getState().authError).toBe('Custom error');
    });

    it('can clear authError by passing null', () => {
      useAuthStore.setState({ authError: 'Previous error' });

      useAuthStore.getState().setAuthError(null);

      expect(useAuthStore.getState().authError).toBeNull();
    });
  });
});
