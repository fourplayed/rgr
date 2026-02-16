import { create } from 'zustand';
import { signInWithEmail, signOut, getSession, fetchProfile } from '@rgr/shared';
import type { Profile } from '@rgr/shared';

interface AuthState {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
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
    set({ isLoading: true, error: null });

    try {
      const result = await signInWithEmail({ email, password });

      if (result.error || !result.data) {
        set({ error: result.error || 'Login failed', isLoading: false });
        return false;
      }

      // Fetch full profile data after successful login
      const profileResult = await fetchProfile(result.data.user.id);

      if (profileResult.error || !profileResult.data) {
        console.log('Profile fetch error:', profileResult.error);
        console.log('User ID:', result.data.user.id);
        set({ error: profileResult.error || 'Failed to load user profile', isLoading: false });
        return false;
      }

      set({
        user: profileResult.data,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      await signOut();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      set({ error: message, isLoading: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });

    try {
      const sessionResult = await getSession();

      if (!sessionResult.data?.user) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      // Fetch authoritative profile data from database
      const profileResult = await fetchProfile(sessionResult.data.user.id);

      if (profileResult.error || !profileResult.data) {
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

  clearError: () => set({ error: null }),
}));
