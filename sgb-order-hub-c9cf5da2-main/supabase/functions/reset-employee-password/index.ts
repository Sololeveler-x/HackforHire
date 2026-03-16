// Edge Function: reset-employee-password
// Admin only. Resets a user's password using service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  try {
    // Verify caller via JWT using adminClient directly (no SUPABASE_ANON_KEY needed)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerErr } = await adminClient.auth.getUser(token);
    if (callerErr || !caller) {
      console.error("JWT verify error:", callerErr);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers });
    }

    const { user_id, password } = await req.json();
    if (!user_id || !password) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers });

    const { error } = await adminClient.auth.admin.updateUserById(user_id, { password });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err) {
    console.error("reset-employee-password error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers });
  }
});
