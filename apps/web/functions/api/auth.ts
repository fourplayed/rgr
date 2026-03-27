/**
 * Cloudflare Pages Function — Auth Proxy
 *
 * Proxies login requests to the Supabase secure-auth Edge Function through
 * the same origin. This avoids cross-origin fetch() calls that Cloudflare's
 * bot protection / WAF rules may block or challenge.
 *
 * Client calls: POST /api/auth  (same origin, no CORS issues)
 * This proxy calls: POST {SUPABASE_URL}/functions/v1/secure-auth
 *
 * Environment variables (set in Cloudflare Pages dashboard):
 *   - SUPABASE_URL
 *   - SUPABASE_ANON_KEY
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: 'Auth proxy not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const functionUrl = `${supabaseUrl}/functions/v1/secure-auth`;

  try {
    const body = await request.text();

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        // Forward client IP so rate limiting works correctly
        'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown',
      },
      body,
    });

    const responseBody = await response.text();

    return new Response(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Authentication service unavailable' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
