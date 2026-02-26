import { create } from 'zustand';
import { signInWithEmail, signOut, getSession, fetchProfile, updateLastLogin } from '@rgr/shared';
import type { Profile } from '@rgr/shared';

interface AuthState {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ error: null });

      const result = await signInWithEmail({ email, password });

      if (!result.success) {
        console.error('[Auth] Login error:', result.error);
        set({ error: result.error });
        throw new Error(result.error);
      }

      const { user: authUser, session } = result.data;

      // Fetch the authoritative profile from the profiles table
      const profileResult = await fetchProfile(authUser.id);

      if (!profileResult.success || !profileResult.data) {
        const errorMsg = profileResult.error || 'Failed to load profile';
        console.error('[Auth]', errorMsg);
        set({ error: errorMsg });
        throw new Error(errorMsg);
      }

      // Block deactivated users from logging in
      if (!profileResult.data.isActive) {
        await signOut();
        const errorMsg = 'Your account has been deactivated. Contact an administrator.';
        set({ error: errorMsg, isLoading: false });
        throw new Error(errorMsg);
      }

      // Fire-and-forget: update last login timestamp
      updateLastLogin(authUser.id).catch((err) =>
        console.error('[Auth] Failed to update last login:', err)
      );

      set({
        user: profileResult.data,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      console.error('[Auth] Login exception:', errorMsg);
      set({ error: errorMsg, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    // Guard: don't re-trigger signOut if already logged out
    if (!useAuthStore.getState().isAuthenticated) return;

    try {
      await signOut();
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      // Always clear local state, even if signOut fails
      set({
        user: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  checkAuth: async () => {
    try {
      const sessionResult = await getSession();

      if (!sessionResult.success || !sessionResult.data) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: sessionResult.success ? null : (sessionResult.error || null),
        });
        return;
      }

      const session = sessionResult.data;
      const profileResult = await fetchProfile(session.user.id);

      if (!profileResult.success || !profileResult.data) {
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        return;
      }

      // Block deactivated users on session restore
      if (!profileResult.data.isActive) {
        await signOut();
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        return;
      }

      set({
        user: profileResult.data,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Auth check failed';
      console.error('[Auth] Check auth exception:', errorMsg);
      set({ user: null, isAuthenticated: false, isLoading: false, error: errorMsg });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
