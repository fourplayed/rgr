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
        console.warn('[Auth] Could not fetch profile, falling back to user_metadata role:', profileError);
      } else if (profile) {
        role = profile.role as UserRole;
        fullName = profile.fullName;
        avatarUrl = profile.avatarUrl;
      }

      console.log('[Auth] Login successful:', {
        userId: data.user.id,
        email: data.user.email,
      });
      console.log(`[Auth] User role: "${role}" — routing will be based on this role`);

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
      console.log('[Auth] Logging out...');

      set({
        user: null,
        isAuthenticated: false,
        error: null,
      });

      const supabase = getSupabaseClient();
      await supabase.auth.signOut();

      console.log('[Auth] Logout successful');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      // Local state already cleared above
    }
  },

  checkAuth: async () => {
    try {
      console.log('[Auth] Checking authentication status...');
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
          console.warn('[Auth] Could not fetch profile, falling back to user_metadata role:', profileError);
        } else if (profile) {
          role = profile.role as UserRole;
          fullName = profile.fullName;
          avatarUrl = profile.avatarUrl;
        }

        console.log('[Auth] Session valid:', {
          userId: session.user.id,
          email: session.user.email,
        });
        console.log(`[Auth] User role: "${role}" — routing will be based on this role`);

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
        console.log('[Auth] No active session');
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
