import { create } from 'zustand';
import { getSupabaseClient, fetchProfile } from '@rgr/shared';

type UserRole = 'driver' | 'mechanic' | 'manager' | 'superuser';

interface UserState {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  avatarUrl: string | null;
}

interface AuthState {
  user: UserState | null;
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

      // Fetch the authoritative role from the profiles table
      let role: UserRole = (data.user.user_metadata?.role as UserRole) || 'driver';
      let fullName: string | null = null;
      let avatarUrl: string | null = null;

      const { data: profile, error: profileError } = await fetchProfile(data.user.id);

      if (profileError) {
        // Could not fetch profile, falling back to user_metadata role
      } else if (profile) {
        // Block deactivated users from logging in
        if (!profile.isActive) {
          await supabase.auth.signOut();
          const errorMsg = 'Your account has been deactivated. Contact an administrator.';
          set({ error: errorMsg, isLoading: false });
          throw new Error(errorMsg);
        }
        role = profile.role as UserRole;
        fullName = profile.fullName;
        avatarUrl = profile.avatarUrl;
      }

      set({
        user: { id: data.user.id, email: data.user.email || '', role, fullName, avatarUrl },
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
        let role: UserRole = (session.user.user_metadata?.role as UserRole) || 'driver';
        let fullName: string | null = null;
        let avatarUrl: string | null = null;

        const { data: profile, error: profileError } = await fetchProfile(session.user.id);

        if (profileError) {
          // Could not fetch profile, falling back to user_metadata role
        } else if (profile) {
          // Block deactivated users on session restore
          if (!profile.isActive) {
            await supabase.auth.signOut();
            set({ user: null, isAuthenticated: false, isLoading: false, error: null });
            return;
          }
          role = profile.role as UserRole;
          fullName = profile.fullName;
          avatarUrl = profile.avatarUrl;
        }

        set({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            role,
            fullName,
            avatarUrl,
          },
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
