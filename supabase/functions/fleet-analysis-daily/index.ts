import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Fleet Analysis Daily Edge Function
 *
 * Daily cron orchestrator that:
 * 1. Queries fleet statistics and operational metrics
 * 2. Sends data to Anthropic Claude API for AI-generated insight
 * 3. Stores the 2-3 sentence analysis in fleet_analysis table
 *
 * Auth: service_role only (invoked by pg_cron)
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Accept both POST (from pg_cron) and GET (manual trigger)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Verify service_role auth — decode JWT payload and check role claim.
    // Exact string comparison fails when the gateway forwards a re-signed token.
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return errorResponse('Unauthorized — no token', 403);
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'service_role') {
        return errorResponse('Unauthorized — service_role required', 403);
      }
    } catch {
      return errorResponse('Unauthorized — invalid token', 403);
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return errorResponse('ANTHROPIC_API_KEY not configured', 500);
    }

    const serviceClient = getServiceClient();
    const today = new Date().toISOString().split('T')[0];

    // ── 1. Gather fleet metrics ──

    // Fleet statistics via existing RPC
    const { data: fleetStats } = await serviceClient.rpc('get_fleet_statistics');

    // 24h scan volume
    const { count: scanCount24h } = await serviceClient
      .from('scan_events')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', new Date(Date.now() - 86400000).toISOString());

    // Overdue maintenance
    const { count: overdueMaintenanceCount } = await serviceClient
      .from('maintenance_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .lt('due_date', today);

    // Open defects
    const { count: openDefectCount } = await serviceClient
      .from('defect_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'reported');

    // Overdue registrations
    const { count: overdueRegoCount } = await serviceClient
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('registration_overdue', true)
      .is('deleted_at', null);

    // Active depots
    const { data: depotData } = await serviceClient
      .from('depots')
      .select('name')
      .is('deleted_at', null);

    // Total scan count (all time)
    const { count: totalScanCount } = await serviceClient
      .from('scan_events')
      .select('*', { count: 'exact', head: true });

    // 7-day scan volume
    const { count: scanCount7d } = await serviceClient
      .from('scan_events')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

    // Maintenance by status
    const { count: scheduledMaintenanceCount } = await serviceClient
      .from('maintenance_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled');

    const { count: inProgressMaintenanceCount } = await serviceClient
      .from('maintenance_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    const { count: completedMaintenanceCount } = await serviceClient
      .from('maintenance_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // Defects by status
    const { count: acceptedDefectCount } = await serviceClient
      .from('defect_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted');

    const { count: resolvedDefectCount } = await serviceClient
      .from('defect_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved');

    // Asset categories
    const { count: trailerCount } = await serviceClient
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'trailer')
      .is('deleted_at', null);

    const { count: dollyCount } = await serviceClient
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'dolly')
      .is('deleted_at', null);

    // Active users (scanned in last 7 days)
    const { data: activeUsers } = await serviceClient
      .from('scan_events')
      .select('scanned_by')
      .gt('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
    const uniqueActiveUsers = new Set(
      (activeUsers ?? []).map((u: { scanned_by: string }) => u.scanned_by)
    ).size;

    const inputData = {
      fleet: fleetStats ?? {
        total_assets: 0,
        serviced: 0,
        maintenance: 0,
        out_of_service: 0,
      },
      asset_breakdown: {
        trailers: trailerCount ?? 0,
        dollies: dollyCount ?? 0,
      },
      scans: {
        last_24h: scanCount24h ?? 0,
        last_7d: scanCount7d ?? 0,
        all_time: totalScanCount ?? 0,
      },
      maintenance: {
        scheduled: scheduledMaintenanceCount ?? 0,
        in_progress: inProgressMaintenanceCount ?? 0,
        completed: completedMaintenanceCount ?? 0,
        overdue: overdueMaintenanceCount ?? 0,
      },
      defects: {
        open: openDefectCount ?? 0,
        accepted: acceptedDefectCount ?? 0,
        resolved: resolvedDefectCount ?? 0,
      },
      overdue_registrations: overdueRegoCount ?? 0,
      depots: (depotData ?? []).map((d: { name: string }) => d.name),
      active_users_7d: uniqueActiveUsers,
    };

    // ── 2. Call Anthropic API ──

    let content: string;
    let tokensUsed: number | null = null;
    let status: 'success' | 'failed' = 'success';

    try {
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 350,
          temperature: 0.3,
          system:
            'You are part of the RGR Fleet team. Write a brief daily update about how our fleet is tracking. Use first-person plural ("our fleet", "we have", "our team"). Do not start with a greeting — jump straight into the update.\n\nReturn exactly four sections wrapped in tags, with no blank lines, bullet points, or other formatting between them:\n[FLEET]1-2 sentences on fleet health, asset counts, service status[/FLEET]\n[SCANS]1-2 sentences on scan activity and team engagement[/SCANS]\n[MAINTENANCE]1-2 sentences on maintenance pipeline status[/MAINTENANCE]\n[COMPLIANCE]1-2 sentences on defects and registration compliance[/COMPLIANCE]\n\nInclude key numbers and percentages. Use "assets" not "vehicles". Say "within service" not "serviceable" or "serviced". Reference depot names and team activity where relevant. Be warm and direct, like a teammate giving a morning briefing. No markdown, no bullet points, no line breaks within sections.',
          messages: [
            {
              role: 'user',
              content: [
                `Fleet snapshot for ${today}:`,
                ``,
                `ASSETS: ${inputData.fleet.total_assets} total (${inputData.asset_breakdown.trailers} trailers, ${inputData.asset_breakdown.dollies} dollies)`,
                `Status: ${inputData.fleet.serviced} within service, ${inputData.fleet.maintenance} in maintenance, ${inputData.fleet.out_of_service} out of service`,
                ``,
                `SCANS: ${inputData.scans.last_24h} in last 24h, ${inputData.scans.last_7d} in last 7 days, ${inputData.scans.all_time} all time`,
                `Active users (7d): ${inputData.active_users_7d}`,
                ``,
                `MAINTENANCE: ${inputData.maintenance.scheduled} scheduled, ${inputData.maintenance.in_progress} in progress, ${inputData.maintenance.completed} completed, ${inputData.maintenance.overdue} overdue`,
                ``,
                `DEFECTS: ${inputData.defects.open} open, ${inputData.defects.accepted} accepted, ${inputData.defects.resolved} resolved`,
                ``,
                `COMPLIANCE: ${inputData.overdue_registrations} overdue registrations`,
                `Depots: ${inputData.depots.join(', ')}`,
              ].join('\n'),
            },
          ],
        }),
      });

      if (!anthropicResponse.ok) {
        const errorBody = await anthropicResponse.text();
        throw new Error(`Anthropic API ${anthropicResponse.status}: ${errorBody}`);
      }

      const anthropicData = await anthropicResponse.json();
      content = anthropicData.content?.[0]?.text ?? 'Analysis unavailable';
      tokensUsed =
        (anthropicData.usage?.input_tokens ?? 0) + (anthropicData.usage?.output_tokens ?? 0);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('Anthropic API call failed:', errMsg);
      content = `Analysis unavailable: ${errMsg.slice(0, 200)}`;
      status = 'failed';
    }

    // ── 3. Upsert into fleet_analysis ──

    const { error: upsertError } = await serviceClient.from('fleet_analysis').upsert(
      {
        analysis_date: today,
        content,
        input_data: inputData,
        status,
        model: 'claude-haiku-4-5-20251001',
        tokens_used: tokensUsed,
      },
      { onConflict: 'analysis_date' }
    );

    if (upsertError) {
      console.error('Failed to upsert fleet_analysis:', upsertError);
      return errorResponse('Failed to store analysis', 500);
    }

    return new Response(
      JSON.stringify({
        status,
        analysisDate: today,
        contentLength: content.length,
        tokensUsed,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('fleet-analysis-daily error:', err);
    return errorResponse('Internal server error', 500);
  }
});
