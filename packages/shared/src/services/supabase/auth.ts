import type { Session, AuthError, User as AuthUser } from '@supabase/supabase-js';
import { z } from 'zod';
import { getSupabaseClient, getSupabaseConfig } from './client';
import { assertQueryResult } from '../../utils';

/** Schema for validating secure-auth Edge Function responses */
const SecureAuthResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    aud: z.string().optional(),
    role: z.string().optional(),
    email_confirmed_at: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  }).passthrough(),
  session: z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    expires_in: z.number().optional(),
    token_type: z.string().optional(),
    expires_at: z.number().optional(),
  }).passthrough(),
});

// Singleton promise for deduplicating concurrent token refreshes
let refreshPromise: Promise<{ data: { session: Session | null }; error: AuthError | null }> | null =
  null;

/**
 * Safely refresh the current session, deduplicating concurrent calls.
 *
 * Multiple components or listeners may trigger a refresh simultaneously
 * (e.g., AppState resume + auth state change). This ensures only one
 * network request is made; subsequent callers share the in-flight promise.
 */
export async function refreshSessionSafe() {
  const supabase = getSupabaseClient();
  if (!refreshPromise) {
    refreshPromise = supabase.auth.refreshSession().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
import type {
  Profile,
  ProfileRow,
  SignInCredentials,
  SignUpInput,
  UpdateProfileInput,
} from '../../types/api/auth';
import { mapRowToProfile, mapProfileToUpdate } from '../../types/api/auth';
import type { ServiceResult } from '../../types';
import { checkRateLimit, recordFailure, recordSuccess } from '../../utils/authRateLimiter';

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
  // Check rate limit before attempting sign-in
  const rateLimit = checkRateLimit(credentials.email);
  if (!rateLimit.allowed) {
    return {
      success: false,
      data: null,
      error: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    recordFailure(credentials.email);
    return { success: false, data: null, error: mapAuthError(error.message) };
  }

  if (!data.user || !data.session) {
    recordFailure(credentials.email);
    return { success: false, data: null, error: 'Authentication failed' };
  }

  recordSuccess(credentials.email);
  return { success: true, data: { user: data.user, session: data.session }, error: null };
}

/**
 * Sign in via the secure-auth Edge Function (server-side rate limiting).
 *
 * The Edge Function validates credentials and applies per-IP and per-email
 * rate limiting that cannot be bypassed from the client. On success it
 * returns a session which is then set on the local Supabase client so
 * subsequent requests are authenticated.
 *
 * If the Edge Function is unreachable or not deployed, returns an error
 * instead of falling back to direct auth (fail-closed for security).
 * Includes a 15s timeout via AbortController.
 */
export async function signInWithEmailSecure(
  credentials: SignInCredentials
): Promise<ServiceResult<{ user: AuthUser; session: Session }>> {
  // Client-side rate limiting still runs as a first line of defense
  const rateLimit = checkRateLimit(credentials.email);
  if (!rateLimit.allowed) {
    return {
      success: false,
      data: null,
      error: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  const config = getSupabaseConfig();
  const functionUrl = `${config.url}/functions/v1/secure-auth`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const body = await response.json();

    // Edge Function not deployed — fail safely, don't bypass
    if (response.status === 404) {
      return {
        success: false,
        data: null,
        error: 'Authentication service unavailable. Please try again later.',
      };
    }

    if (!response.ok) {
      recordFailure(credentials.email);
      const errorMessage = body.error?.message || body.error || 'Authentication failed';
      return { success: false, data: null, error: errorMessage };
    }

    const parsed = SecureAuthResponseSchema.safeParse(body);
    if (!parsed.success) {
      recordFailure(credentials.email);
      return { success: false, data: null, error: 'Invalid authentication response' };
    }

    const { user: validatedUser, session: validatedSession } = parsed.data;

    // Establish the session on the local Supabase client so that
    // subsequent queries (profile fetch, etc.) are authenticated.
    const supabase = getSupabaseClient();
    await supabase.auth.setSession({
      access_token: validatedSession.access_token,
      refresh_token: validatedSession.refresh_token,
    });

    recordSuccess(credentials.email);
    return {
      success: true,
      data: {
        user: assertQueryResult<AuthUser>(validatedUser),
        session: assertQueryResult<Session>({
          access_token: validatedSession.access_token,
          refresh_token: validatedSession.refresh_token,
          expires_at: validatedSession.expires_at,
          expires_in: validatedSession.expires_in,
          token_type: validatedSession.token_type,
          user: validatedUser,
        }),
      },
      error: null,
    };
  } catch (networkError) {
    clearTimeout(timeout);
    const isTimeout = networkError instanceof Error && networkError.name === 'AbortError';
    return {
      success: false,
      data: null,
      error: isTimeout
        ? 'Login timed out. Please check your connection and try again.'
        : 'Authentication service unavailable. Please try again later.',
    };
  }
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
  // Check rate limit before attempting verification
  const rateLimit = checkRateLimit(email);
  if (!rateLimit.allowed) {
    return {
      success: false,
      data: null,
      error: `Too many attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (error) {
    recordFailure(email);
    return { success: false, data: null, error: 'Current password is incorrect' };
  }

  recordSuccess(email);
  return { success: true, data: undefined, error: null };
}

/**
 * Update user password (after reset or while authenticated)
 */
export async function updatePassword(newPassword: string): Promise<ServiceResult<AuthUser>> {
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
export async function fetchProfile(userId: string): Promise<ServiceResult<Profile>> {
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
export async function updateLastLogin(userId: string): Promise<ServiceResult<void>> {
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
    'Password should be at least 6 characters': 'Password must be at least 6 characters',
    'Signup requires a valid password': 'Please provide a valid password',
  };

  const mapped = errorMap[message];
  if (!mapped) {
    console.warn('[Auth] Unmapped error:', message);
  }
  return mapped || 'An authentication error occurred';
}
