import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

/**
 * Secure Auth Edge Function
 *
 * Server-side authentication proxy that adds rate limiting per IP and email.
 * Mobile and web clients call this instead of hitting Supabase Auth directly,
 * so brute-force protection cannot be bypassed by clearing client-side state.
 *
 * Rate limiting strategy:
 *   - Per-email: 5 failures within a rolling 15-minute window triggers lockout.
 *     Lockout uses exponential backoff: 30s, 60s, 120s, 300s (max).
 *   - Per-IP: 20 failures within a rolling 15-minute window triggers a 5-minute lockout.
 *   - Successful login resets the failure counter for that email.
 *
 * In-memory storage is used for rate-limit state. Deno Deploy isolates may
 * recycle, which resets state -- this is acceptable because Supabase GoTrue
 * also has its own built-in rate limits as a backstop.
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
// In-memory rate-limit store
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  failures: number;
  firstFailureAt: number;
  lockoutUntil: number;
  lockoutSeconds: number;
}

const emailLimits = new Map<string, RateLimitEntry>();
const ipLimits = new Map<string, RateLimitEntry>();

/**
 * Prune entries whose window has expired to prevent unbounded memory growth.
 * Called lazily on each request.
 */
function pruneExpired(
  store: Map<string, RateLimitEntry>,
  windowMs: number,
): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    const windowExpired = now - entry.firstFailureAt > windowMs;
    const lockoutExpired = entry.lockoutUntil > 0 && now >= entry.lockoutUntil;
    if (windowExpired && (entry.lockoutUntil === 0 || lockoutExpired)) {
      store.delete(key);
    }
  }
}

interface CheckResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

function checkLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  maxFailures: number,
  windowMs: number,
): CheckResult {
  const entry = store.get(key);
  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const now = Date.now();

  // If the rolling window has expired AND lockout has expired, reset
  if (
    now - entry.firstFailureAt > windowMs &&
    (entry.lockoutUntil === 0 || now >= entry.lockoutUntil)
  ) {
    store.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  // If currently locked out
  if (entry.lockoutUntil > 0 && now < entry.lockoutUntil) {
    const retryAfterSeconds = Math.ceil((entry.lockoutUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

function recordFailure(
  store: Map<string, RateLimitEntry>,
  key: string,
  maxFailures: number,
  initialLockoutS: number,
  maxLockoutS: number,
): void {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, {
      failures: 1,
      firstFailureAt: now,
      lockoutUntil: 0,
      lockoutSeconds: initialLockoutS,
    });
    return;
  }

  entry.failures += 1;

  if (entry.failures >= maxFailures) {
    const lockoutSeconds = Math.min(
      entry.lockoutSeconds * 2,
      maxLockoutS,
    );
    entry.lockoutUntil = now + lockoutSeconds * 1000;
    entry.lockoutSeconds = lockoutSeconds;
  }

  store.set(key, entry);
}

function recordSuccess(
  store: Map<string, RateLimitEntry>,
  key: string,
): void {
  store.delete(key);
}

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Parse request body
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Extract client IP from headers (Supabase/Deno Deploy sets these)
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Prune expired entries lazily
    pruneExpired(emailLimits, EMAIL_WINDOW_MS);
    pruneExpired(ipLimits, IP_WINDOW_MS);

    // Check IP rate limit
    const ipCheck = checkLimit(
      ipLimits,
      clientIp,
      IP_MAX_FAILURES,
      IP_WINDOW_MS,
    );
    if (!ipCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `Too many login attempts from this device. Please try again in ${ipCheck.retryAfterSeconds} seconds.`,
          retryAfterSeconds: ipCheck.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(ipCheck.retryAfterSeconds),
          },
        },
      );
    }

    // Check email rate limit
    const emailCheck = checkLimit(
      emailLimits,
      normalizedEmail,
      EMAIL_MAX_FAILURES,
      EMAIL_WINDOW_MS,
    );
    if (!emailCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `Too many login attempts. Please try again in ${emailCheck.retryAfterSeconds} seconds.`,
          retryAfterSeconds: emailCheck.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(emailCheck.retryAfterSeconds),
          },
        },
      );
    }

    // Create a Supabase client using the service role key for admin operations,
    // but we use the anon key here since signInWithPassword is a public endpoint.
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
      recordFailure(
        emailLimits,
        normalizedEmail,
        EMAIL_MAX_FAILURES,
        EMAIL_INITIAL_LOCKOUT_S,
        EMAIL_MAX_LOCKOUT_S,
      );
      recordFailure(
        ipLimits,
        clientIp,
        IP_MAX_FAILURES,
        IP_LOCKOUT_S,
        IP_LOCKOUT_S,
      );

      // Map common Supabase auth errors to user-friendly messages
      const errorMessage = mapAuthError(error.message);

      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!data.user || !data.session) {
      recordFailure(
        emailLimits,
        normalizedEmail,
        EMAIL_MAX_FAILURES,
        EMAIL_INITIAL_LOCKOUT_S,
        EMAIL_MAX_LOCKOUT_S,
      );
      recordFailure(
        ipLimits,
        clientIp,
        IP_MAX_FAILURES,
        IP_LOCKOUT_S,
        IP_LOCKOUT_S,
      );

      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Success -- clear rate-limit state for this email (IP state is left
    // alone so that attackers cycling through emails still get IP-limited).
    recordSuccess(emailLimits, normalizedEmail);

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

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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
