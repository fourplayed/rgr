import { create } from 'zustand';
import { getSupabaseClient, fetchProfile, updateLastLogin } from '@rgr/shared';
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
      const supabase = getSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[Auth] Login error:', error);
        set({ error: error.message });
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        const errorMsg = 'Login failed - no user data returned';
        console.error('[Auth]', errorMsg);
        set({ error: errorMsg });
        throw new Error(errorMsg);
      }

      // Fetch the authoritative profile from the profiles table
      const profileResult = await fetchProfile(data.user.id);

      let user: Profile;

      if (!profileResult.success || !profileResult.data) {
        // Could not fetch profile, construct a minimal fallback from user_metadata
        const meta = data.user.user_metadata ?? {};
        user = {
          id: data.user.id,
          email: data.user.email || '',
          fullName: (meta['full_name'] as string) || '',
          role: (meta['role'] as Profile['role']) || 'driver',
          phone: null,
          avatarUrl: null,
          isActive: true,
          employeeId: null,
          depot: null,
          lastLoginAt: null,
          createdAt: data.user.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Block deactivated users from logging in
        if (!profileResult.data.isActive) {
          await supabase.auth.signOut();
          const errorMsg = 'Your account has been deactivated. Contact an administrator.';
          set({ error: errorMsg, isLoading: false });
          throw new Error(errorMsg);
        }
        user = profileResult.data;
      }

      // Fire-and-forget: update last login timestamp
      updateLastLogin(data.user.id).catch((err) =>
        console.error('[Auth] Failed to update last login:', err)
      );

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      console.error('[Auth] Login exception:', errorMsg);
      set({
        error: errorMsg,
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    // Guard: don't re-trigger signOut if already logged out
    if (!useAuthStore.getState().isAuthenticated) return;

    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
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
      const supabase = getSupabaseClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[Auth] Session check error:', error);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: error.message,
        });
        return;
      }

      if (session?.user) {
        const profileResult = await fetchProfile(session.user.id);

        let user: Profile;

        if (!profileResult.success || !profileResult.data) {
          // Could not fetch profile, construct a minimal fallback from user_metadata
          const meta = session.user.user_metadata ?? {};
          user = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: (meta['full_name'] as string) || '',
            role: (meta['role'] as Profile['role']) || 'driver',
            phone: null,
            avatarUrl: null,
            isActive: true,
            employeeId: null,
            depot: null,
            lastLoginAt: null,
            createdAt: session.user.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        } else {
          // Block deactivated users on session restore
          if (!profileResult.data.isActive) {
            await supabase.auth.signOut();
            set({ user: null, isAuthenticated: false, isLoading: false, error: null });
            return;
          }
          user = profileResult.data;
        }

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Auth check failed';
      console.error('[Auth] Check auth exception:', errorMsg);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMsg,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
