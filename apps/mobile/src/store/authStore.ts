import { create } from 'zustand';
import {
  signInWithEmailSecure,
  signOut,
  getSession as getSupabaseSession,
  fetchProfile,
  updateProfile,
  updateLastLogin,
  getSupabaseClient,
} from '@rgr/shared';
import type { UpdateProfileInput } from '@rgr/shared';
import type { Profile } from '@rgr/shared';
import {
  saveSession,
  getSession as getStoredSession,
  clearSession,
  isAutoLoginEnabled,
  type StoredSession,
} from '../utils/secureStorage';
import { eventBus, AppEvents } from '../utils/eventBus';
import { logger } from '../utils/logger';

interface AuthState {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoginInProgress: boolean;
  error: string | null;
  authError: string | null;
  autoLoginAttempted: boolean;

  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  clearAuthError: () => void;
  setAuthError: (error: string | null) => void;
  attemptAutoLogin: () => Promise<boolean>;
  handleSessionExpired: () => Promise<void>;
  clearSavedSession: () => Promise<void>;
  updateUserProfile: (updates: UpdateProfileInput) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isLoginInProgress: false,
  error: null,
  authError: null,
  autoLoginAttempted: false,

  login: async (email: string, password: string) => {
    if (get().isLoginInProgress) return { success: false, error: 'Login in progress' };
    set({ isLoginInProgress: true, isLoading: true, error: null });

    try {
      const result = await signInWithEmailSecure({ email, password });

      if (!result.success) {
        set({ error: result.error, isLoading: false, isLoginInProgress: false });
        return { success: false, error: result.error };
      }

      // Fetch profile and update last login in parallel (both only need user ID)
      const [profileResult] = await Promise.all([
        fetchProfile(result.data.user.id),
        updateLastLogin(result.data.user.id).catch((err: unknown) =>
          logger.error('Failed to update last login', err)
        ),
      ]);

      if (!profileResult.success) {
        set({
          error: profileResult.error,
          isLoading: false,
          isLoginInProgress: false,
        });
        return { success: false, error: profileResult.error };
      }

      if (!profileResult.data.isActive) {
        await signOut();
        const errorMsg = 'Your account has been deactivated. Contact an administrator.';
        set({ error: errorMsg, isLoading: false, isLoginInProgress: false });
        return { success: false, error: errorMsg };
      }

      // Save session tokens (not password) for auto-login
      // Placed AFTER the isActive check so deactivated users never get persisted tokens
      const sessionData: StoredSession = {
        access_token: result.data.session.access_token,
        refresh_token: result.data.session.refresh_token,
      };
      if (result.data.session.expires_at !== undefined) {
        sessionData.expires_at = result.data.session.expires_at;
      }
      await saveSession(sessionData);

      set({
        user: profileResult.data,
        isAuthenticated: true,
        isLoading: false,
        isLoginInProgress: false,
        error: null,
      });

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ error: message, isLoading: false, isLoginInProgress: false });
      return { success: false, error: message };
    }
  },

  logout: async () => {
    // Reset state BEFORE signOut() to prevent the onAuthStateChange listener
    // from firing handleSessionExpired() and showing "Session Expired" modal
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      authError: null,
      autoLoginAttempted: false,
    });

    await clearSession();
    eventBus.emit(AppEvents.USER_LOGOUT);

    try {
      await signOut();
    } catch (error: unknown) {
      // Best-effort: local auth state is already cleared
      logger.warn('signOut failed during logout', error);
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });

    try {
      const sessionResult = await getSupabaseSession();

      if (!sessionResult.success || !sessionResult.data?.user) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      // Fetch authoritative profile data from database
      const profileResult = await fetchProfile(sessionResult.data.user.id);

      if (!profileResult.success) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      if (!profileResult.data.isActive) {
        await signOut();
        await clearSession();
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      set({
        user: profileResult.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      logger.error('Auth check failed:', error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  attemptAutoLogin: async () => {
    // Prevent repeated attempts
    if (get().autoLoginAttempted) {
      return false;
    }

    set({ autoLoginAttempted: true });

    try {
      const enabled = await isAutoLoginEnabled();
      if (!enabled) {
        return false;
      }

      const storedSession = await getStoredSession();
      if (!storedSession) {
        return false;
      }

      // Check if token has expired before attempting to use it
      // This prevents unnecessary network requests with known-expired tokens
      if (storedSession.expires_at === undefined || typeof storedSession.expires_at !== 'number') {
        logger.warn('Stored session missing expires_at, requiring re-authentication');
        await clearSession();
        set({ authError: 'Session expired. Please log in again.' });
        return false;
      }

      const expiresAt = storedSession.expires_at * 1000; // Convert to milliseconds
      const now = Date.now();
      const bufferMs = 60 * 1000; // 1 minute buffer to account for clock skew
      if (now >= expiresAt - bufferMs) {
        // Token expired or about to expire, clear and require fresh login
        await clearSession();
        set({ authError: 'Session expired. Please log in again.' });
        return false;
      }

      // Restore session using stored tokens (not password)
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.setSession({
        access_token: storedSession.access_token,
        refresh_token: storedSession.refresh_token,
      });

      if (error || !data.session || !data.user) {
        // Clear invalid session tokens
        await clearSession();
        set({ authError: 'Session expired. Please log in again.' });
        return false;
      }

      // Update stored session with refreshed tokens
      const refreshedSession: StoredSession = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      };
      if (data.session.expires_at !== undefined) {
        refreshedSession.expires_at = data.session.expires_at;
      }
      await saveSession(refreshedSession);

      // Fetch full profile data
      const profileResult = await fetchProfile(data.user.id);

      if (!profileResult.success) {
        await supabase.auth.signOut();
        await clearSession();
        set({ authError: 'Failed to load profile. Please log in again.' });
        return false;
      }

      if (!profileResult.data.isActive) {
        await signOut();
        await clearSession();
        set({ authError: 'Your account has been deactivated. Contact an administrator.' });
        return false;
      }

      set({
        user: profileResult.data,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        authError: null,
      });

      return true;
    } catch (error: unknown) {
      // If auto-login fails, clear session tokens and set error
      try {
        await clearSession();
      } catch (e: unknown) {
        logger.warn('clearSession failed during error recovery', e);
      }
      set({ authError: 'Session expired. Please log in again.' });
      return false;
    } finally {
      // Guarantee isLoading is cleared on every exit path
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  clearAuthError: () => set({ authError: null }),

  setAuthError: (error: string | null) => set({ authError: error }),

  handleSessionExpired: async () => {
    await clearSession();
    eventBus.emit(AppEvents.USER_LOGOUT);
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      authError: 'Session expired. Please log in again.',
      autoLoginAttempted: false,
    });
  },

  clearSavedSession: async () => {
    await clearSession();
  },

  updateUserProfile: async (updates: UpdateProfileInput) => {
    const user = get().user;
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const result = await updateProfile(user.id, updates);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      set({ user: result.data });
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      return { success: false, error: message };
    }
  },
}));
