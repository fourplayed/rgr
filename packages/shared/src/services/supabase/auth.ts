import type { Session, User as AuthUser } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import type {
  Profile,
  ProfileRow,
  SignInCredentials,
  SignUpInput,
  UpdateProfileInput,
  AuthResult,
  SessionInfo,
} from '@rgr/shared/types/api/auth';
import { mapRowToProfile, mapProfileToUpdate } from '@rgr/shared/types/api/auth';
import type { ServiceResult } from '@rgr/shared/types';

/**
 * Supabase Auth Service
 *
 * Low-level authentication operations using Supabase Auth.
 * For higher-level auth operations with business logic, use AuthService.
 */

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  credentials: SignInCredentials
): Promise<ServiceResult<{ user: AuthUser; session: Session }>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return { data: null, error: mapAuthError(error.message) };
  }

  if (!data.user || !data.session) {
    return { data: null, error: 'Authentication failed' };
  }

  return { data: { user: data.user, session: data.session }, error: null };
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  input: SignUpInput
): Promise<ServiceResult<{ user: AuthUser; session: Session | null }>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        phone: input.phone || null,
        employee_id: input.employeeId || null,
        depot: input.depot || null,
      },
    },
  });

  if (error) {
    return { data: null, error: mapAuthError(error.message) };
  }

  if (!data.user) {
    return { data: null, error: 'Registration failed' };
  }

  return { data: { user: data.user, session: data.session }, error: null };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

/**
 * Get the current session
 */
export async function getSession(): Promise<ServiceResult<Session | null>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data.session, error: null };
}

/**
 * Get the current auth user
 */
export async function getAuthUser(): Promise<ServiceResult<AuthUser | null>> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: user, error: null };
}

/**
 * Refresh the current session
 */
export async function refreshSession(): Promise<ServiceResult<Session>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data.session) {
    return { data: null, error: 'Failed to refresh session' };
  }

  return { data: data.session, error: null };
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  redirectUrl?: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const options = redirectUrl ? { redirectTo: redirectUrl } : {};
  const { error } = await supabase.auth.resetPasswordForEmail(email, options);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

/**
 * Update user password (after reset or while authenticated)
 */
export async function updatePassword(
  newPassword: string
): Promise<ServiceResult<AuthUser>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data.user) {
    return { data: null, error: 'Failed to update password' };
  }

  return { data: data.user, error: null };
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  const supabase = getSupabaseClient();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => subscription.unsubscribe();
}

/**
 * Fetch user profile by ID
 */
export async function fetchProfile(
  userId: string
): Promise<ServiceResult<Profile>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: 'Profile not found' };
  }

  return { data: mapRowToProfile(data as ProfileRow), error: null };
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: UpdateProfileInput
): Promise<ServiceResult<Profile>> {
  const supabase = getSupabaseClient();

  const dbUpdates = mapProfileToUpdate(updates);

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data) {
    return { data: null, error: 'Failed to update profile' };
  }

  return { data: mapRowToProfile(data as ProfileRow), error: null };
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(
  userId: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

/**
 * Map Supabase auth errors to user-friendly messages
 */
function mapAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password',
    'Email not confirmed': 'Please verify your email address',
    'User not found': 'No account found with this email',
    'Email already registered': 'An account with this email already exists',
    'Password should be at least 6 characters':
      'Password must be at least 8 characters',
    'Signup requires a valid password': 'Please provide a valid password',
  };

  return errorMap[message] || message;
}
