import { create } from 'zustand';
import { getSupabaseClient } from '@rgr/shared/services/supabase/client';

type UserRole = 'driver' | 'manager' | 'superuser';

interface AuthState {
  user: { id: string; email: string; role: UserRole } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      const role = (data.user.user_metadata?.role as UserRole) || 'driver';
      set({
        user: { id: data.user.id, email: data.user.email || '', role },
        isAuthenticated: true,
      });
    }
  },
  logout: async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },
  checkAuth: async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const role = (session.user.user_metadata?.role as UserRole) || 'driver';
        set({
          user: { id: session.user.id, email: session.user.email || '', role },
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
