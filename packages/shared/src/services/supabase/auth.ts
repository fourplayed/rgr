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
} from '../../types/api/auth';
import { mapRowToProfile, mapProfileToUpdate } from '../../types/api/auth';
import type { ServiceResult } from '../../types';

/**
 * Supabase Auth Service
 *
 * Low-level authentication operations using Supabase Auth.
 * Business logic (profile fetching, role checks, etc.) lives in app-level auth stores.
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
    return { success: false, data: null, error: mapAuthError(error.message) };
  }

  if (!data.user || !data.session) {
    return { success: false, data: null, error: 'Authentication failed' };
  }

  return { success: true, data: { user: data.user, session: data.session }, error: null };
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
    return { success: false, data: null, error: mapAuthError(error.message) };
  }

  if (!data.user) {
    return { success: false, data: null, error: 'Registration failed' };
  }

  return { success: true, data: { user: data.user, session: data.session }, error: null };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, data: null, error: error.message };
  }

  return { success: true, data: undefined, error: null };
}

/**
 * Get the current session
 */
export async function getSession(): Promise<ServiceResult<Session | null>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { success: false, data: null, error: error.message };
  }

  return { success: true, data: data.session, error: null };
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
    return { success: false, data: null, error: error.message };
  }

  return { success: true, data: undefined, error: null };
}

/**
 * Verify current password by attempting to sign in
 * Used for reauthentication before sensitive operations like password change
 */
export async function verifyCurrentPassword(
  email: string,
  currentPassword: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (error) {
    return { success: false, data: null, error: 'Current password is incorrect' };
  }

  return { success: true, data: undefined, error: null };
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
    return { success: false, data: null, error: error.message };
  }

  if (!data.user) {
    return { success: false, data: null, error: 'Failed to update password' };
  }

  return { success: true, data: data.user, error: null };
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
    return { success: false, data: null, error: error.message };
  }

  if (!data) {
    return { success: false, data: null, error: 'Profile not found' };
  }

  return { success: true, data: mapRowToProfile(data as ProfileRow), error: null };
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
    return { success: false, data: null, error: error.message };
  }

  if (!data) {
    return { success: false, data: null, error: 'Failed to update profile' };
  }

  return { success: true, data: mapRowToProfile(data as ProfileRow), error: null };
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
    return { success: false, data: null, error: error.message };
  }

  return { success: true, data: undefined, error: null };
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
