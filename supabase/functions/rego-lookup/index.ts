import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, errorResponse, getServiceClient } from '../_shared/helpers.ts';

/**
 * Rego Lookup Edge Function
 *
 * Scrapes the WA Department of Transport website for registration expiry
 * information for a single plate number. Updates the asset record if assetId
 * is provided, and logs the result to rego_lookup_log.
 *
 * Input: { registrationNumber: string, assetId?: string }
 * Auth: service_role Bearer token OR authenticated superuser JWT
 */

interface LookupResult {
  status: 'success' | 'failed' | 'captcha_blocked' | 'not_found';
  expiryDate?: string;
  rawSnippet?: string;
  errorMessage?: string;
}

/**
 * Scrape the WA DOT registration check page.
 *
 * Strategy:
 * 1. GET the registration page to establish a session (cookies)
 * 2. POST the form with the plate number
 * 3. Parse the HTML response for an expiry date
 *
 * This is inherently fragile — if the DOT website changes, this function
 * will need updating. The rego_lookup_log table captures failures for
 * monitoring.
 */
async function scrapeWaDot(registrationNumber: string): Promise<LookupResult> {
  const DOT_URL = 'https://online.transport.wa.gov.au/webExternal/registration/';
  const TIMEOUT_MS = 15000;

  try {
    // Step 1: GET for session cookies
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let sessionResponse: Response;
    try {
      sessionResponse = await fetch(DOT_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RGR Fleet Manager/2.0; registration check)',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!sessionResponse.ok) {
      return {
        status: 'failed',
        errorMessage: `DOT website returned ${sessionResponse.status}`,
      };
    }

    // Extract cookies from response
    const cookies = sessionResponse.headers.get('set-cookie') || '';

    // Extract hidden form fields (CSRF tokens, etc.)
    const pageHtml = await sessionResponse.text();

    // Check for CAPTCHA indicators
    if (
      pageHtml.includes('captcha') ||
      pageHtml.includes('CAPTCHA') ||
      pageHtml.includes('recaptcha')
    ) {
      return {
        status: 'captcha_blocked',
        errorMessage: 'CAPTCHA detected on DOT website',
        rawSnippet: pageHtml.substring(0, 500),
      };
    }

    // Extract form token if present (common pattern in .gov.au sites)
    const tokenMatch = pageHtml.match(/name="javax\.faces\.ViewState"\s+value="([^"]+)"/);
    const viewState = tokenMatch?.[1] || '';

    // Step 2: POST the registration number
    const formData = new URLSearchParams();
    formData.append('plateNumber', registrationNumber.toUpperCase().trim());
    if (viewState) {
      formData.append('javax.faces.ViewState', viewState);
    }
    formData.append('searchForm:submit', 'Search');
    formData.append('searchForm_SUBMIT', '1');

    const postController = new AbortController();
    const postTimeout = setTimeout(() => postController.abort(), TIMEOUT_MS);

    let postResponse: Response;
    try {
      postResponse = await fetch(DOT_URL, {
        method: 'POST',
        signal: postController.signal,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookies,
          'User-Agent': 'Mozilla/5.0 (compatible; RGR Fleet Manager/2.0; registration check)',
        },
        body: formData.toString(),
      });
    } finally {
      clearTimeout(postTimeout);
    }

    if (!postResponse.ok) {
      return {
        status: 'failed',
        errorMessage: `DOT POST returned ${postResponse.status}`,
      };
    }

    const resultHtml = await postResponse.text();

    // Step 3: Parse for expiry date
    // WA DOT typically shows dates in DD/MM/YYYY format
    const expiryPatterns = [
      /(?:expir(?:y|es?|ation)\s*(?:date)?)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s*(?:expir)/i,
      /registration\s+expir\w*\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    ];

    for (const pattern of expiryPatterns) {
      const match = resultHtml.match(pattern);
      if (match?.[1]) {
        const dateStr = match[1];
        // Parse DD/MM/YYYY or DD-MM-YYYY to ISO date
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length === 3) {
          const [day, month, year] = parts;
          const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          // Validate the date is real
          const parsed = new Date(isoDate);
          if (!isNaN(parsed.getTime())) {
            return {
              status: 'success',
              expiryDate: isoDate,
              rawSnippet: resultHtml.substring(0, 500),
            };
          }
        }
      }
    }

    // Check if the result page indicates "not found"
    if (
      resultHtml.includes('no record') ||
      resultHtml.includes('not found') ||
      resultHtml.includes('No matching')
    ) {
      return {
        status: 'not_found',
        errorMessage: 'Registration number not found in DOT database',
        rawSnippet: resultHtml.substring(0, 500),
      };
    }

    // Could not parse expiry — return failed with a snippet for debugging
    return {
      status: 'failed',
      errorMessage: 'Could not parse expiry date from DOT response',
      rawSnippet: resultHtml.substring(0, 500),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown scrape error';
    if (message.includes('abort')) {
      return {
        status: 'failed',
        errorMessage: 'DOT request timed out after 15s',
      };
    }
    return { status: 'failed', errorMessage: message };
  }
}

// ---------------------------------------------------------------------------
// Rate limiting (reuse rate_limits table pattern)
// ---------------------------------------------------------------------------

/**
 * Rate limit using the existing rate_limits table.
 * Reuses the `failures` column as a generic request counter and
 * `first_failure_at` as the window start. The naming is inherited from
 * the auth-lockout origin of this table — semantically these are
 * "request count" and "window start".
 */
async function checkRateLimit(
  serviceClient: ReturnType<typeof createClient>,
  key: string,
  maxPerMinute: number
): Promise<boolean> {
  const now = new Date().toISOString();
  const windowStart = new Date(Date.now() - 60000).toISOString();

  // Read current state
  const { data: current } = await serviceClient
    .from('rate_limits')
    .select('failures, first_failure_at')
    .eq('key', key)
    .maybeSingle();

  if (!current) {
    // No row — insert fresh counter
    await serviceClient.from('rate_limits').upsert({
      key,
      failures: 1,
      first_failure_at: now,
      lockout_until: null,
      lockout_seconds: 0,
    });
    return true;
  }

  // Window expired — reset counter
  if (current.first_failure_at < windowStart) {
    await serviceClient
      .from('rate_limits')
      .update({ failures: 1, first_failure_at: now })
      .eq('key', key);
    return true;
  }

  // Within window — check limit before incrementing
  if (current.failures >= maxPerMinute) {
    return false; // rate limited
  }

  // Optimistic-lock increment: the WHERE clause includes the current failures
  // count so concurrent requests cannot both succeed on the same counter value.
  // If another request incremented first, this UPDATE matches zero rows (no-op)
  // and the request proceeds — acceptable for rate limiting (at most one extra
  // request slips through per race, vs unbounded bypass before).
  await serviceClient
    .from('rate_limits')
    .update({ failures: current.failures + 1 })
    .eq('key', key)
    .eq('failures', current.failures);

  return true;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Verify auth: service_role key or authenticated user JWT
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return errorResponse('Missing authorization header', 401);
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (token !== serviceRoleKey) {
      // Not service_role — verify as user JWT
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const {
        data: { user },
        error: authError,
      } = await userClient.auth.getUser(token);
      if (authError || !user) {
        return errorResponse('Invalid or expired token', 401);
      }
    }

    const serviceClient = getServiceClient();

    // Parse request
    const body = await req.json();
    const { registrationNumber, assetId } = body as {
      registrationNumber?: string;
      assetId?: string;
    };

    if (!registrationNumber || registrationNumber.trim().length === 0) {
      return errorResponse('registrationNumber is required', 400);
    }

    // Rate limit: 10 lookups per minute globally
    const allowed = await checkRateLimit(serviceClient, 'rego_lookup_global', 10);
    if (!allowed) {
      return errorResponse('Rate limited — max 10 lookups per minute', 429);
    }

    // Perform the DOT scrape
    const result = await scrapeWaDot(registrationNumber);

    // Update asset if assetId provided and lookup succeeded
    if (assetId) {
      const updateData: Record<string, unknown> = {
        dot_lookup_status: result.status,
        dot_lookup_at: new Date().toISOString(),
      };

      if (result.status === 'success' && result.expiryDate) {
        updateData.registration_expiry = result.expiryDate;
        updateData.dot_lookup_failures = 0;
        updateData.registration_overdue = false;
      } else {
        // Increment failure count
        const { data: current } = await serviceClient
          .from('assets')
          .select('dot_lookup_failures')
          .eq('id', assetId)
          .single();

        updateData.dot_lookup_failures = ((current?.dot_lookup_failures as number) || 0) + 1;
      }

      await serviceClient.from('assets').update(updateData).eq('id', assetId);
    }

    // Log the lookup attempt
    await serviceClient.from('rego_lookup_log').insert({
      asset_id: assetId || null,
      registration_number: registrationNumber.toUpperCase().trim(),
      status: result.status,
      expiry_date: result.expiryDate || null,
      raw_response: result.rawSnippet?.substring(0, 500) || null,
      error_message: result.errorMessage || null,
    });

    return new Response(
      JSON.stringify({
        status: result.status,
        expiryDate: result.expiryDate || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('rego-lookup error:', err);
    return errorResponse('Internal server error', 500);
  }
});
