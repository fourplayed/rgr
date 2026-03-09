import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Send Push Notification Edge Function
 *
 * Generic push sender via the Expo Push API.
 * Sends notifications to all users with specified roles.
 * Handles stale token cleanup when Expo reports DeviceNotRegistered.
 *
 * Input: { title: string, body: string, data?: object, targetRoles: string[] }
 * Auth: service_role only
 */

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100; // Expo limit per request

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: "default";
  priority: "high";
}

interface ExpoPushReceipt {
  status: "ok" | "error";
  details?: { error?: string };
}

/**
 * Send a batch of push notifications via Expo Push API.
 * Returns the count of successful sends and any stale token IDs to remove.
 */
async function sendBatch(
  messages: ExpoPushMessage[],
): Promise<{ sent: number; failed: number; staleTokens: string[] }> {
  let sent = 0;
  let failed = 0;
  const staleTokens: string[] = [];

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error(
        `Expo Push API returned ${response.status}: ${await response.text()}`,
      );
      return { sent: 0, failed: messages.length, staleTokens: [] };
    }

    const result = await response.json();
    const receipts: ExpoPushReceipt[] = result.data || [];

    for (let i = 0; i < receipts.length; i++) {
      const receipt = receipts[i];
      if (receipt.status === "ok") {
        sent++;
      } else {
        failed++;
        if (receipt.details?.error === "DeviceNotRegistered") {
          staleTokens.push(messages[i].to);
        }
      }
    }
  } catch (err) {
    console.error("Expo Push API error:", err);
    failed = messages.length;
  }

  return { sent, failed, staleTokens };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // Verify service_role auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)) {
      // Also accept if called internally via service_role JWT
      const token = authHeader?.replace("Bearer ", "");
      if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
        return errorResponse("Unauthorized — service_role required", 403);
      }
    }

    const { title, body, data, targetRoles } = (await req.json()) as {
      title: string;
      body: string;
      data?: Record<string, unknown>;
      targetRoles: string[];
    };

    if (!title || !body || !targetRoles || targetRoles.length === 0) {
      return errorResponse(
        "title, body, and targetRoles are required",
        400,
      );
    }

    const serviceClient = getServiceClient();

    // Get push tokens for target roles (join profiles for role + is_active)
    const { data: tokenRows, error: tokenError } = await serviceClient
      .from("push_tokens")
      .select("token, profiles!inner(role, is_active)")
      .in("profiles.role", targetRoles)
      .eq("profiles.is_active", true);

    if (tokenError) {
      console.error("Error fetching push tokens:", tokenError);
      return errorResponse(
        `Failed to fetch push tokens: ${tokenError.message}`,
        500,
      );
    }

    if (!tokenRows || tokenRows.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, tokensRemoved: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build Expo push messages
    interface TokenRowWithProfile {
      token: string;
      profiles: { role: string; is_active: boolean };
    }
    const tokens = (tokenRows as unknown as TokenRowWithProfile[]).map(
      (r) => r.token,
    );
    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token,
      title,
      body,
      data: data || {},
      sound: "default" as const,
      priority: "high" as const,
    }));

    // Send in batches of 100
    let totalSent = 0;
    let totalFailed = 0;
    const allStaleTokens: string[] = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const result = await sendBatch(batch);
      totalSent += result.sent;
      totalFailed += result.failed;
      allStaleTokens.push(...result.staleTokens);
    }

    // Clean up stale tokens
    let tokensRemoved = 0;
    if (allStaleTokens.length > 0) {
      const { count } = await serviceClient
        .from("push_tokens")
        .delete()
        .in("token", allStaleTokens);
      tokensRemoved = count || 0;
    }

    return new Response(
      JSON.stringify({
        sent: totalSent,
        failed: totalFailed,
        tokensRemoved,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("send-push-notification error:", err);
    return errorResponse("Internal server error", 500);
  }
});
