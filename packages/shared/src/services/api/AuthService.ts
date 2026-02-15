import type { Session } from '@supabase/supabase-js';
import {
  signInWithEmail,
  signUpWithEmail,
  signOut as supabaseSignOut,
  getSession,
  getAuthUser,
  refreshSession,
  sendPasswordResetEmail,
  updatePassword,
  onAuthStateChange,
  fetchProfile,
  updateProfile as updateProfileDb,
  updateLastLogin,
} from '../supabase/auth';
import { getSupabaseClient } from '../supabase/client';
import type {
  Profile,
  ProfileRow,
  SignInCredentials,
  SignUpInput,
  UpdateProfileInput,
  AuthResult,
  SessionInfo,
  CreateUserInput,
} from '@rgr/shared/types/api/auth';
import {
  SignInCredentialsSchema,
  SignUpInputSchema,
  UpdateProfileInputSchema,
  mapRowToProfile,
} from '@rgr/shared/types/api/auth';
import type { UserRole } from '@rgr/shared/types/enums/UserRole';
import type { ServiceResult } from '@rgr/shared/types';

/**
 * AuthService - High-level authentication service
 *
 * Provides business logic layer on top of Supabase auth operations.
 * Implements singleton pattern for consistent state management.
 *
 * Features:
 * - Input validation with Zod schemas
 * - Profile fetching after authentication
 * - Role-based access helpers
 * - Session management
 * - User lifecycle management
 *
 * @example
 * ```typescript
 * const authService = getAuthService();
 *
 * // Sign in
 * const result = await authService.signIn({
 *   email: 'user@example.com',
 *   password: 'password123',
 * });
 *
 * if (result.error) {
 *   console.error(result.error);
 * } else {
 *   console.log('Signed in:', result.data.profile);
 * }
 * ```
 */
export class AuthService {
  /**
   * Sign in with email and password
   *
   * Validates credentials, authenticates with Supabase, fetches profile,
   * and updates last login timestamp.
   */
  async signIn(credentials: SignInCredentials): Promise<ServiceResult<AuthResult>> {
    // Validate input
    const validation = SignInCredentialsSchema.safeParse(credentials);
    if (!validation.success) {
      return {
        data: null,
        error: validation.error.errors[0]?.message || 'Invalid credentials',
      };
    }

    // Authenticate with Supabase
    const authResult = await signInWithEmail(credentials);
    if (authResult.error || !authResult.data) {
      return {
        data: null,
        error: authResult.error || 'Authentication failed',
      };
    }

    const { user, session } = authResult.data;

    // Fetch user profile
    const profileResult = await fetchProfile(user.id);
    if (profileResult.error || !profileResult.data) {
      // User authenticated but no profile - shouldn't happen
      await supabaseSignOut();
      return {
        data: null,
        error: 'User profile not found. Contact your administrator.',
      };
    }

    const profile = profileResult.data;

    // Check if user is active
    if (!profile.isActive) {
      await supabaseSignOut();
      return {
        data: null,
        error: 'Your account has been deactivated. Contact your administrator.',
      };
    }

    // Update last login timestamp (fire and forget)
    updateLastLogin(user.id).catch(console.error);

    return {
      data: {
        profile,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at ?? null,
        error: null,
      },
      error: null,
    };
  }

  /**
   * Sign up a new user
   *
   * Note: By default, new users get 'driver' role.
   * Admins should use createUser() for other roles.
   */
  async signUp(input: SignUpInput): Promise<ServiceResult<AuthResult>> {
    // Validate input
    const validation = SignUpInputSchema.safeParse(input);
    if (!validation.success) {
      return {
        data: null,
        error: validation.error.errors[0]?.message || 'Invalid input',
      };
    }

    // Register with Supabase
    const authResult = await signUpWithEmail(input);
    if (authResult.error || !authResult.data) {
      return {
        data: null,
        error: authResult.error || 'Registration failed',
      };
    }

    const { user, session } = authResult.data;

    // Profile is created by database trigger
    // Fetch it to return
    const profileResult = await fetchProfile(user.id);

    return {
      data: {
        profile: profileResult.data,
        accessToken: session?.access_token ?? null,
        refreshToken: session?.refresh_token ?? null,
        expiresAt: session?.expires_at ?? null,
        error: null,
      },
      error: null,
    };
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<ServiceResult<void>> {
    return supabaseSignOut();
  }

  /**
   * Get current session information
   */
  async getSessionInfo(): Promise<ServiceResult<SessionInfo>> {
    const sessionResult = await getSession();

    if (sessionResult.error) {
      return { data: null, error: sessionResult.error };
    }

    const session = sessionResult.data;

    if (!session) {
      return {
        data: {
          isAuthenticated: false,
          profile: null,
          accessToken: null,
          expiresAt: null,
        },
        error: null,
      };
    }

    // Fetch profile for authenticated user
    const profileResult = await fetchProfile(session.user.id);

    return {
      data: {
        isAuthenticated: true,
        profile: profileResult.data,
        accessToken: session.access_token,
        expiresAt: session.expires_at ?? null,
      },
      error: null,
    };
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ServiceResult<Profile | null>> {
    const authResult = await getAuthUser();

    if (authResult.error) {
      return { data: null, error: authResult.error };
    }

    if (!authResult.data) {
      return { data: null, error: null };
    }

    return fetchProfile(authResult.data.id);
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<ServiceResult<Session>> {
    return refreshSession();
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<ServiceResult<void>> {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { data: null, error: 'Invalid email address' };
    }

    return sendPasswordResetEmail(email);
  }

  /**
   * Update password (after reset or while authenticated)
   */
  async updatePassword(newPassword: string): Promise<ServiceResult<void>> {
    if (!newPassword || newPassword.length < 8) {
      return { data: null, error: 'Password must be at least 8 characters' };
    }

    const result = await updatePassword(newPassword);
    if (result.error) {
      return { data: null, error: result.error };
    }

    return { data: undefined, error: null };
  }

  /**
   * Update current user's profile
   */
  async updateProfile(updates: UpdateProfileInput): Promise<ServiceResult<Profile>> {
    // Validate input
    const validation = UpdateProfileInputSchema.safeParse(updates);
    if (!validation.success) {
      return {
        data: null,
        error: validation.error.errors[0]?.message || 'Invalid input',
      };
    }

    // Get current user
    const authResult = await getAuthUser();
    if (authResult.error || !authResult.data) {
      return { data: null, error: 'Not authenticated' };
    }

    return updateProfileDb(authResult.data.id, updates);
  }

  /**
   * Subscribe to auth state changes
   *
   * @returns Unsubscribe function
   */
  onAuthStateChange(
    callback: (profile: Profile | null) => void
  ): () => void {
    return onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        callback(null);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const profileResult = await fetchProfile(session.user.id);
        callback(profileResult.data);
      }
    });
  }

  /**
   * Check if user has a specific role
   */
  hasRole(profile: Profile | null, ...roles: UserRole[]): boolean {
    if (!profile) return false;
    return roles.includes(profile.role);
  }

  /**
   * Check if user is manager or above
   */
  isManagerOrAbove(profile: Profile | null): boolean {
    return this.hasRole(profile, 'manager', 'superuser');
  }

  /**
   * Check if user is superuser
   */
  isSuperuser(profile: Profile | null): boolean {
    return this.hasRole(profile, 'superuser');
  }

  /**
   * Create a new user (admin only)
   *
   * Requires service role key - should only be called from secure context
   * (Edge Function or server-side)
   */
  async createUser(input: CreateUserInput): Promise<ServiceResult<Profile>> {
    const supabase = getSupabaseClient();

    try {
      // Create auth user with admin API
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true,
          user_metadata: {
            full_name: input.fullName,
            role: input.role,
            phone: input.phone || null,
            employee_id: input.employeeId || null,
            depot: input.depot || null,
          },
        });

      if (authError) {
        return { data: null, error: authError.message };
      }

      if (!authData.user) {
        return { data: null, error: 'Failed to create user' };
      }

      // Profile is created by database trigger
      // Fetch it to return (may need a short delay for trigger to complete)
      await new Promise((resolve) => setTimeout(resolve, 100));

      const profileResult = await fetchProfile(authData.user.id);

      if (profileResult.error || !profileResult.data) {
        // Fallback: manually create profile if trigger failed
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: input.email,
            full_name: input.fullName,
            role: input.role,
            phone: input.phone || null,
            employee_id: input.employeeId || null,
            depot: input.depot || null,
            is_active: true,
          })
          .select()
          .single();

        if (profileError) {
          return { data: null, error: 'User created but profile setup failed' };
        }

        return { data: mapRowToProfile(profile as ProfileRow), error: null };
      }

      return profileResult;
    } catch (error) {
      console.error('Create user error:', error);
      return { data: null, error: 'Failed to create user' };
    }
  }

  /**
   * Deactivate a user (admin only)
   */
  async deactivateUser(userId: string): Promise<ServiceResult<void>> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: undefined, error: null };
  }

  /**
   * Reactivate a user (admin only)
   */
  async reactivateUser(userId: string): Promise<ServiceResult<void>> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('id', userId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: undefined, error: null };
  }

  /**
   * Update user role (superuser only)
   */
  async updateUserRole(
    userId: string,
    newRole: UserRole
  ): Promise<ServiceResult<Profile>> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'User not found' };
    }

    return { data: mapRowToProfile(data as ProfileRow), error: null };
  }
}

// Singleton instance
let authServiceInstance: AuthService | null = null;

/**
 * Get the AuthService singleton instance
 */
export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}

/**
 * Reset the AuthService instance (useful for testing)
 */
export function resetAuthService(): void {
  authServiceInstance = null;
}
