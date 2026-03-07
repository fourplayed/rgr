import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

/**
 * Secure Auth Edge Function
 *
 * Server-side authentication proxy that adds rate limiting per IP and email.
 * Mobile and web clients call this instead of hitting Supabase Auth directly,
 * so brute-force protection cannot be bypassed from the client.
 *
 * Rate limiting strategy:
 *   - Per-email: 5 failures within a rolling 15-minute window triggers lockout.
 *     Lockout uses exponential backoff: 30s, 60s, 120s, 300s (max).
 *   - Per-IP: 20 failures within a rolling 15-minute window triggers a 5-minute lockout.
 *   - Successful login resets the failure counter for that email.
 *
 * Rate-limit state is persisted in the `rate_limits` DB table so it survives
 * Deno Deploy isolate recycles.
 */

// ---------------------------------------------------------------------------
// Rate-limit configuration
// ---------------------------------------------------------------------------

const EMAIL_MAX_FAILURES = 5;
const EMAIL_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const EMAIL_INITIAL_LOCKOUT_S = 30;
const EMAIL_MAX_LOCKOUT_S = 300;

const IP_MAX_FAILURES = 20;
const IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const IP_LOCKOUT_S = 300; // 5 minutes flat lockout

// ---------------------------------------------------------------------------
// DB-backed rate-limit helpers
// ---------------------------------------------------------------------------

interface RateLimitRow {
  key: string;
  failures: number;
  first_failure_at: string;
  lockout_until: string | null;
  lockout_seconds: number;
}

interface CheckResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function pruneExpired(
  serviceClient: ReturnType<typeof createClient>,
): Promise<void> {
  await serviceClient
    .from("rate_limits")
    .delete()
    .lt("first_failure_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .or("lockout_until.is.null,lockout_until.lt." + new Date().toISOString());
}

async function checkLimit(
  serviceClient: ReturnType<typeof createClient>,
  key: string,
  _maxFailures: number,
  windowMs: number,
): Promise<CheckResult> {
  const { data } = await serviceClient
    .from("rate_limits")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (!data) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const entry = data as RateLimitRow;
  const now = Date.now();
  const firstFailureAt = new Date(entry.first_failure_at).getTime();

  // If the rolling window has expired AND lockout has expired, reset
  if (now - firstFailureAt > windowMs) {
    const lockoutExpired = !entry.lockout_until || now >= new Date(entry.lockout_until).getTime();
    if (lockoutExpired) {
      await serviceClient.from("rate_limits").delete().eq("key", key);
      return { allowed: true, retryAfterSeconds: 0 };
    }
  }

  // If currently locked out
  if (entry.lockout_until) {
    const lockoutUntil = new Date(entry.lockout_until).getTime();
    if (now < lockoutUntil) {
      const retryAfterSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

async function recordFailure(
  serviceClient: ReturnType<typeof createClient>,
  key: string,
  maxFailures: number,
  initialLockoutS: number,
  maxLockoutS: number,
): Promise<void> {
  const { data } = await serviceClient
    .from("rate_limits")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (!data) {
    await serviceClient.from("rate_limits").upsert({
      key,
      failures: 1,
      first_failure_at: new Date().toISOString(),
      lockout_until: null,
      lockout_seconds: initialLockoutS,
    });
    return;
  }

  const entry = data as RateLimitRow;
  const newFailures = entry.failures + 1;
  const updates: Record<string, unknown> = { failures: newFailures };

  if (newFailures >= maxFailures) {
    const isFirstLockout = !entry.lockout_until;
    const lockoutSeconds = isFirstLockout
      ? initialLockoutS
      : Math.min(entry.lockout_seconds * 2, maxLockoutS);
    updates.lockout_until = new Date(Date.now() + lockoutSeconds * 1000).toISOString();
    updates.lockout_seconds = lockoutSeconds;
  }

  await serviceClient.from("rate_limits").update(updates).eq("key", key);
}

async function recordSuccess(
  serviceClient: ReturnType<typeof createClient>,
  key: string,
): Promise<void> {
  await serviceClient.from("rate_limits").delete().eq("key", key);
}

// ---------------------------------------------------------------------------
// Structured error response helper
// ---------------------------------------------------------------------------

function errorResponse(
  code: string,
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
  extra?: Record<string, unknown>,
): Response {
  return new Response(
    JSON.stringify({ error: { code, message }, ...extra }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// ---------------------------------------------------------------------------
// CORS headers — restrict to known origins
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405, corsHeaders);
  }

  try {
    // Parse request body
    const { email, password } = await req.json();

    if (!email || !password) {
      return errorResponse("VALIDATION_ERROR", "Email and password are required", 400, corsHeaders);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Extract client IP from headers (Supabase/Deno Deploy sets these)
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const serviceClient = getServiceClient();

    // Prune expired entries lazily
    await pruneExpired(serviceClient);

    // Check IP rate limit
    const ipCheck = await checkLimit(
      serviceClient,
      `ip:${clientIp}`,
      IP_MAX_FAILURES,
      IP_WINDOW_MS,
    );
    if (!ipCheck.allowed) {
      return errorResponse(
        "RATE_LIMITED",
        `Too many login attempts from this device. Please try again in ${ipCheck.retryAfterSeconds} seconds.`,
        429,
        corsHeaders,
        { retryAfterSeconds: ipCheck.retryAfterSeconds },
      );
    }

    // Check email rate limit
    const emailCheck = await checkLimit(
      serviceClient,
      `email:${normalizedEmail}`,
      EMAIL_MAX_FAILURES,
      EMAIL_WINDOW_MS,
    );
    if (!emailCheck.allowed) {
      return errorResponse(
        "RATE_LIMITED",
        `Too many login attempts. Please try again in ${emailCheck.retryAfterSeconds} seconds.`,
        429,
        corsHeaders,
        { retryAfterSeconds: emailCheck.retryAfterSeconds },
      );
    }

    // Create a Supabase client using the anon key since signInWithPassword is a public endpoint.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Attempt sign-in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      // Record failure for both email and IP
      await recordFailure(
        serviceClient,
        `email:${normalizedEmail}`,
        EMAIL_MAX_FAILURES,
        EMAIL_INITIAL_LOCKOUT_S,
        EMAIL_MAX_LOCKOUT_S,
      );
      await recordFailure(
        serviceClient,
        `ip:${clientIp}`,
        IP_MAX_FAILURES,
        IP_LOCKOUT_S,
        IP_LOCKOUT_S,
      );

      // Map common Supabase auth errors to user-friendly messages
      const errorMessage = mapAuthError(error.message);

      return errorResponse("INVALID_CREDENTIALS", errorMessage, 401, corsHeaders);
    }

    if (!data.user || !data.session) {
      await recordFailure(
        serviceClient,
        `email:${normalizedEmail}`,
        EMAIL_MAX_FAILURES,
        EMAIL_INITIAL_LOCKOUT_S,
        EMAIL_MAX_LOCKOUT_S,
      );
      await recordFailure(
        serviceClient,
        `ip:${clientIp}`,
        IP_MAX_FAILURES,
        IP_LOCKOUT_S,
        IP_LOCKOUT_S,
      );

      return errorResponse("INVALID_CREDENTIALS", "Authentication failed", 401, corsHeaders);
    }

    // Success -- clear rate-limit state for this email (IP state is left
    // alone so that attackers cycling through emails still get IP-limited).
    await recordSuccess(serviceClient, `email:${normalizedEmail}`);

    return new Response(
      JSON.stringify({
        user: data.user,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
          token_type: data.session.token_type,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("secure-auth error:", err);

    return errorResponse("INTERNAL_ERROR", "Internal server error", 500, corsHeaders);
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    "Invalid login credentials": "Invalid email or password",
    "Email not confirmed": "Please verify your email address",
    "User not found": "No account found with this email",
  };
  return errorMap[message] || message;
}
