import { create } from 'zustand';
import {
  signInWithEmail,
  signOut,
  getSession as getSupabaseSession,
  fetchProfile,
  updateProfile,
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
import { useLocationStore } from './locationStore';

interface AuthState {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
  clearSavedSession: () => Promise<void>;
  updateUserProfile: (updates: UpdateProfileInput) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  authError: null,
  autoLoginAttempted: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await signInWithEmail({ email, password });

      if (!result.success) {
        set({ error: result.error, isLoading: false });
        return { success: false, error: result.error };
      }

      // Save session tokens (not password) for auto-login
      const sessionData: StoredSession = {
        access_token: result.data.session.access_token,
        refresh_token: result.data.session.refresh_token,
      };
      if (result.data.session.expires_at !== undefined) {
        sessionData.expires_at = result.data.session.expires_at;
      }
      await saveSession(sessionData);

      // Fetch full profile data after successful login
      const profileResult = await fetchProfile(result.data.user.id);

      if (!profileResult.success) {
        set({
          error: profileResult.error,
          isLoading: false,
        });
        return { success: false, error: profileResult.error };
      }

      set({
        user: profileResult.data,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      // Clear session tokens on logout
      await clearSession();

      // Clear resolved depot
      useLocationStore.getState().clearResolvedDepot();

      await signOut();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        autoLoginAttempted: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      set({ error: message, isLoading: false });
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

      set({
        user: profileResult.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
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
        await clearSession();
        set({ authError: 'Failed to load profile. Please log in again.' });
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
    } catch (error) {
      // If auto-login fails, clear session tokens and set error
      await clearSession();
      set({ authError: 'Session expired. Please log in again.' });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  clearAuthError: () => set({ authError: null }),

  setAuthError: (error: string | null) => set({ authError: error }),

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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      return { success: false, error: message };
    }
  },
}));
