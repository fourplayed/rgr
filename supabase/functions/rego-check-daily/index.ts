import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Rego Check Daily Edge Function
 *
 * Daily cron orchestrator that:
 * 1. Finds assets with registration expiring in 7 or 2 days
 * 2. Re-scrapes overdue assets (max 3 failures) from WA DOT
 * 3. Sends push notifications via the send-push-notification function
 * 4. Deduplicates notifications using notification_log
 *
 * Auth: service_role only (invoked by pg_cron)
 */

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Call the rego-lookup function for a single asset.
 * Uses direct HTTP call to the sibling edge function.
 */
async function lookupRego(
  registrationNumber: string,
  assetId: string,
): Promise<{ status: string; expiryDate?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/rego-lookup`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registrationNumber, assetId }),
      },
    );

    if (!response.ok) {
      return { status: "failed" };
    }

    return await response.json();
  } catch {
    return { status: "failed" };
  }
}

/**
 * Send a push notification to superuser admins via the send-push-notification function.
 */
async function sendNotification(
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<{ sent: number; failed: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-push-notification`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body,
          data,
          targetRoles: ["superuser", "manager"],
        }),
      },
    );

    if (!response.ok) {
      return { sent: 0, failed: 1 };
    }

    return await response.json();
  } catch {
    return { sent: 0, failed: 1 };
  }
}

/**
 * Format date for display in notifications.
 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Process items in batches of N using Promise.allSettled.
 */
async function processBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Send a push notification for an asset if one hasn't already been sent
 * for this notification type + target date. Handles dedup, logging, and sending.
 *
 * Uses the existing UNIQUE(asset_id, notification_type, target_date) constraint
 * for atomic dedup via upsert instead of SELECT-then-INSERT (TOCTOU safe).
 * Excludes previously failed notifications so they can be retried.
 */
async function sendNotificationIfNew(
  serviceClient: ReturnType<typeof createClient>,
  asset: {
    id: string;
    asset_number: string;
    registration_number: string;
    registration_expiry: string;
  },
  notificationType: string,
  title: string,
  body: string,
): Promise<boolean> {
  // Check dedup — exclude failed notifications so they can be retried
  const { data: existing } = await serviceClient
    .from("notification_log")
    .select("id, status")
    .eq("asset_id", asset.id)
    .eq("notification_type", notificationType)
    .eq("target_date", asset.registration_expiry)
    .neq("status", "failed")
    .maybeSingle();

  if (existing) return false;

  // Delete any previous failed entry so the upsert can create a fresh one
  await serviceClient
    .from("notification_log")
    .delete()
    .eq("asset_id", asset.id)
    .eq("notification_type", notificationType)
    .eq("target_date", asset.registration_expiry)
    .eq("status", "failed");

  await serviceClient.from("notification_log").insert({
    asset_id: asset.id,
    notification_type: notificationType,
    target_date: asset.registration_expiry,
    status: "sending",
  });

  const pushResult = await sendNotification(title, body, {
    assetId: asset.id,
    type: notificationType,
  });

  await serviceClient
    .from("notification_log")
    .update({
      status: pushResult.sent > 0 ? "sent" : "failed",
      sent_at: pushResult.sent > 0 ? new Date().toISOString() : null,
      error_message: pushResult.sent === 0 ? "No recipients received" : null,
    })
    .eq("asset_id", asset.id)
    .eq("notification_type", notificationType)
    .eq("target_date", asset.registration_expiry);

  return pushResult.sent > 0;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Accept both POST (from pg_cron) and GET (manual trigger)
  if (req.method !== "POST" && req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // Verify service_role auth
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return errorResponse("Unauthorized — service_role required", 403);
    }

    const serviceClient = getServiceClient();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Calculate date windows
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split("T")[0];

    const in2Days = new Date(today);
    in2Days.setDate(in2Days.getDate() + 2);
    const in2DaysStr = in2Days.toISOString().split("T")[0];

    const in8Days = new Date(today);
    in8Days.setDate(in8Days.getDate() + 8);
    const in8DaysStr = in8Days.toISOString().split("T")[0];

    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);
    const in3DaysStr = in3Days.toISOString().split("T")[0];

    let checked = 0;
    let updated = 0;
    let notificationsSent = 0;
    const errors: string[] = [];

    // ── 1. Re-scrape overdue assets (expiry < today, failures < 3) ──
    const { data: overdueAssets } = await serviceClient
      .from("assets")
      .select("id, asset_number, registration_number, registration_expiry, dot_lookup_failures")
      .lt("registration_expiry", todayStr)
      .lt("dot_lookup_failures", 3)
      .is("deleted_at", null)
      .not("registration_number", "is", null)
      .limit(20);

    // Process overdue lookups sequentially (avoid hammering DOT).
    // Deadline guard: leave 10s buffer for the notification phase.
    const MAX_LOOKUPS_PER_RUN = 5;
    const LOOKUP_DEADLINE_MS = 50_000;
    const lookupStart = Date.now();
    const overdueToCheck = (overdueAssets || []).slice(0, MAX_LOOKUPS_PER_RUN);

    for (const asset of overdueToCheck) {
      if (Date.now() - lookupStart > LOOKUP_DEADLINE_MS) {
        errors.push(`Stopped after ${checked} lookups — approaching execution time limit`);
        break;
      }

      checked++;
      try {
        const result = await lookupRego(
          asset.registration_number,
          asset.id,
        );

        if (result.status === "success" && result.expiryDate) {
          // DOT shows renewed — rego-lookup already updated the asset
          updated++;
        } else {
          // Still expired — mark as overdue
          await serviceClient
            .from("assets")
            .update({ registration_overdue: true })
            .eq("id", asset.id);
        }

        // Small delay between DOT requests
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err) {
        errors.push(
          `Lookup failed for ${asset.asset_number}: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    }

    // ── 2. Send 7-day expiry notifications (batched) ──
    // Assets expiring between today+7 and today+8 (within the 7-day window)
    const { data: sevenDayAssets } = await serviceClient
      .from("assets")
      .select("id, asset_number, registration_number, registration_expiry")
      .gte("registration_expiry", in7DaysStr)
      .lt("registration_expiry", in8DaysStr)
      .is("deleted_at", null)
      .not("registration_number", "is", null);

    const NOTIFICATION_BATCH_SIZE = 5;

    const sevenDayResults = await processBatch(
      sevenDayAssets || [],
      (asset) => sendNotificationIfNew(
        serviceClient,
        asset,
        "rego_expiry_7d",
        "Registration Expiring Soon",
        `${asset.asset_number} (${asset.registration_number}) expires on ${formatDate(asset.registration_expiry)}`,
      ),
      NOTIFICATION_BATCH_SIZE,
    );
    for (const r of sevenDayResults) {
      if (r.status === "fulfilled" && r.value) notificationsSent++;
    }

    // ── 3. Send 2-day expiry notifications (batched) ──
    const { data: twoDayAssets } = await serviceClient
      .from("assets")
      .select("id, asset_number, registration_number, registration_expiry")
      .gte("registration_expiry", in2DaysStr)
      .lt("registration_expiry", in3DaysStr)
      .is("deleted_at", null)
      .not("registration_number", "is", null);

    const twoDayResults = await processBatch(
      twoDayAssets || [],
      (asset) => sendNotificationIfNew(
        serviceClient,
        asset,
        "rego_expiry_2d",
        "Registration Expiring in 2 Days",
        `${asset.asset_number} (${asset.registration_number}) expires on ${formatDate(asset.registration_expiry)} — renew urgently!`,
      ),
      NOTIFICATION_BATCH_SIZE,
    );
    for (const r of twoDayResults) {
      if (r.status === "fulfilled" && r.value) notificationsSent++;
    }

    // ── 4. Send overdue notifications (batched) ──
    const { data: confirmedOverdue } = await serviceClient
      .from("assets")
      .select("id, asset_number, registration_number, registration_expiry")
      .eq("registration_overdue", true)
      .is("deleted_at", null)
      .not("registration_number", "is", null);

    const overdueResults = await processBatch(
      confirmedOverdue || [],
      (asset) => sendNotificationIfNew(
        serviceClient,
        asset,
        "rego_overdue",
        "Registration OVERDUE",
        `${asset.asset_number} (${asset.registration_number}) registration expired on ${formatDate(asset.registration_expiry)} and has NOT been renewed`,
      ),
      NOTIFICATION_BATCH_SIZE,
    );
    for (const r of overdueResults) {
      if (r.status === "fulfilled" && r.value) notificationsSent++;
    }

    return new Response(
      JSON.stringify({
        checked,
        updated,
        notificationsSent,
        errors,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("rego-check-daily error:", err);
    return errorResponse("Internal server error", 500);
  }
});
