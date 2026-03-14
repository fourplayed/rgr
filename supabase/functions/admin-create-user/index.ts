import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Admin Create User Edge Function
 *
 * Creates a new user with a specified role. Only superusers can call this.
 * Verifies caller role against the profiles table (not JWT claims).
 * Rolls back auth user creation if profile update fails.
 *
 * Includes IP-based rate limiting (10 creates/minute) via the rate_limits table.
 */

// ---------------------------------------------------------------------------
// CORS headers — restrict to known origins
// ---------------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_ROLES = ['driver', 'mechanic', 'manager', 'superuser'];

// ---------------------------------------------------------------------------
// Rate-limit configuration (IP-based, 10 creates per minute)
// ---------------------------------------------------------------------------

const CREATE_USER_MAX = 10;
const CREATE_USER_WINDOW_MS = 60 * 1000; // 1 minute
const CREATE_USER_LOCKOUT_S = 60;

// ---------------------------------------------------------------------------
// Structured error response helper
// ---------------------------------------------------------------------------

function errorResponse(
  code: string,
  message: string,
  status: number,
  extra?: Record<string, unknown>
): Response {
  return new Response(JSON.stringify({ error: { code, message }, ...extra }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Rate-limit helpers (DB-backed via rate_limits table)
// ---------------------------------------------------------------------------

async function checkIpRateLimit(
  serviceClient: ReturnType<typeof createClient>,
  ip: string
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const key = `admin-create:${ip}`;
  const { data } = await serviceClient.from('rate_limits').select('*').eq('key', key).maybeSingle();

  if (!data) return { allowed: true, retryAfterSeconds: 0 };

  const now = Date.now();
  const firstFailureAt = new Date(data.first_failure_at).getTime();

  // Window expired and no active lockout — reset
  if (now - firstFailureAt > CREATE_USER_WINDOW_MS) {
    const lockoutExpired = !data.lockout_until || now >= new Date(data.lockout_until).getTime();
    if (lockoutExpired) {
      await serviceClient.from('rate_limits').delete().eq('key', key);
      return { allowed: true, retryAfterSeconds: 0 };
    }
  }

  // Currently locked out
  if (data.lockout_until) {
    const lockoutUntil = new Date(data.lockout_until).getTime();
    if (now < lockoutUntil) {
      return { allowed: false, retryAfterSeconds: Math.ceil((lockoutUntil - now) / 1000) };
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

async function recordCreateAttempt(
  serviceClient: ReturnType<typeof createClient>,
  ip: string
): Promise<void> {
  const key = `admin-create:${ip}`;
  const { data } = await serviceClient.from('rate_limits').select('*').eq('key', key).maybeSingle();

  if (!data) {
    await serviceClient.from('rate_limits').upsert({
      key,
      failures: 1,
      first_failure_at: new Date().toISOString(),
      lockout_until: null,
      lockout_seconds: CREATE_USER_LOCKOUT_S,
    });
    return;
  }

  const newCount = data.failures + 1;
  const updates: Record<string, unknown> = { failures: newCount };

  if (newCount >= CREATE_USER_MAX) {
    updates.lockout_until = new Date(Date.now() + CREATE_USER_LOCKOUT_S * 1000).toISOString();
  }

  await serviceClient.from('rate_limits').update(updates).eq('key', key);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Extract and verify JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('UNAUTHORIZED', 'Missing authorization token', 401);
    }

    const jwt = authHeader.replace('Bearer ', '');

    // Use anon client to verify the JWT and get the user
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const {
      data: { user: callerAuth },
      error: authError,
    } = await anonClient.auth.getUser(jwt);

    if (authError || !callerAuth) {
      return errorResponse('UNAUTHORIZED', 'Invalid or expired token', 401);
    }

    // Verify caller role from profiles table (never trust JWT claims)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', callerAuth.id)
      .single();

    if (profileError || !callerProfile) {
      return errorResponse('UNAUTHORIZED', 'Could not verify caller permissions', 403);
    }

    if (callerProfile.role !== 'superuser') {
      return errorResponse('UNAUTHORIZED', 'Only superusers can create users', 403);
    }

    // IP-based rate limiting for user creation
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const rateCheck = await checkIpRateLimit(serviceClient, clientIp);
    if (!rateCheck.allowed) {
      return errorResponse(
        'RATE_LIMITED',
        `Too many user creation attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        429,
        { retryAfterSeconds: rateCheck.retryAfterSeconds }
      );
    }

    // Record this attempt against the rate limit
    await recordCreateAttempt(serviceClient, clientIp);

    // Parse and validate input
    const { email, password, fullName, role, phone, employeeId, depot } = await req.json();

    if (!email || !password || !fullName || !role) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Email, password, full name, and role are required',
        400
      );
    }

    if (typeof password !== 'string' || password.length < 8) {
      return errorResponse('VALIDATION_ERROR', 'Password must be at least 8 characters', 400);
    }

    if (!VALID_ROLES.includes(role)) {
      return errorResponse(
        'VALIDATION_ERROR',
        `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
        400
      );
    }

    // Create auth user via admin API (service_role key)
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password, // Never logged or stored
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !newUser?.user) {
      const msg = createError?.message || 'Failed to create auth user';
      return errorResponse('VALIDATION_ERROR', msg, 400);
    }

    const newUserId = newUser.user.id;

    // Upsert profile — handles both cases:
    // 1. Trigger already created the row → updates it
    // 2. Trigger failed silently → inserts new row
    const profileData: Record<string, unknown> = {
      id: newUserId,
      email: email.toLowerCase().trim(),
      full_name: fullName,
      role,
      is_active: true,
    };
    if (phone !== undefined && phone !== null) profileData.phone = phone;
    if (employeeId !== undefined && employeeId !== null) profileData.employee_id = employeeId;
    if (depot !== undefined && depot !== null) profileData.depot = depot;

    const { data: updatedProfile, error: updateError } = await serviceClient
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select('id, role, full_name')
      .single();

    if (updateError || !updatedProfile) {
      // Rollback: delete the orphaned auth user
      const updateMsg = updateError?.message || 'No profile row returned';
      const updateCode = updateError?.code || 'unknown';
      console.error(
        `Profile update failed [${updateCode}]: ${updateMsg}. Rolling back auth user ${newUserId}`
      );
      await serviceClient.auth.admin.deleteUser(newUserId);

      return errorResponse('INTERNAL_ERROR', `Failed to set up user profile: ${updateMsg}`, 500);
    }

    return new Response(
      JSON.stringify({
        user: { id: newUserId, email: newUser.user.email },
        profile: {
          id: updatedProfile.id,
          role: updatedProfile.role,
          fullName: updatedProfile.full_name,
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('admin-create-user error:', err);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
});
