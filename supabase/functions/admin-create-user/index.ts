import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

/**
 * Admin Create User Edge Function
 *
 * Creates a new user with a specified role. Only superusers can call this.
 * Verifies caller role against the profiles table (not JWT claims).
 * Rolls back auth user creation if profile update fails.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_ROLES = ["driver", "mechanic", "manager", "superuser"];

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Extract and verify JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const jwt = authHeader.replace("Bearer ", "");

    // Use anon client to verify the JWT and get the user
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: { user: callerAuth }, error: authError } =
      await anonClient.auth.getUser(jwt);

    if (authError || !callerAuth) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify caller role from profiles table (never trust JWT claims)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile, error: profileError } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", callerAuth.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: "Could not verify caller permissions" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (callerProfile.role !== "superuser") {
      return new Response(
        JSON.stringify({ error: "Only superusers can create users" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse and validate input
    const { email, password, fullName, role, phone, employeeId, depot } =
      await req.json();

    if (!email || !password || !fullName || !role) {
      return new Response(
        JSON.stringify({
          error: "Email, password, full name, and role are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return new Response(
        JSON.stringify({
          error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create auth user via admin API (service_role key)
    const { data: newUser, error: createError } =
      await serviceClient.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password, // Never logged or stored
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createError || !newUser?.user) {
      const msg = createError?.message || "Failed to create auth user";
      return new Response(
        JSON.stringify({ error: msg }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
    if (employeeId !== undefined && employeeId !== null)
      profileData.employee_id = employeeId;
    if (depot !== undefined && depot !== null) profileData.depot = depot;

    const { data: updatedProfile, error: updateError } = await serviceClient
      .from("profiles")
      .upsert(profileData, { onConflict: "id" })
      .select("id, role, full_name")
      .single();

    if (updateError || !updatedProfile) {
      // Rollback: delete the orphaned auth user
      const updateMsg = updateError?.message || "No profile row returned";
      const updateCode = updateError?.code || "unknown";
      console.error(
        `Profile update failed [${updateCode}]: ${updateMsg}. Rolling back auth user ${newUserId}`,
      );
      await serviceClient.auth.admin.deleteUser(newUserId);

      return new Response(
        JSON.stringify({
          error: `Failed to set up user profile: ${updateMsg}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("admin-create-user error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
