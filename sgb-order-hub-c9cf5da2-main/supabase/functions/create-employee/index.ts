// Edge Function: create-employee
// Called by Admin only (JWT verified). Creates a Supabase auth user + profile + role.

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

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    console.log("=== create-employee called ===");
    console.log("SUPABASE_URL exists:", !!Deno.env.get("SUPABASE_URL"));
    console.log("SERVICE_ROLE_KEY exists:", !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

    // Verify caller via JWT using adminClient directly (no SUPABASE_ANON_KEY needed)
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header exists:", !!authHeader);
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized - no auth header" }), { status: 401, headers });

    const token = authHeader.replace("Bearer ", "");
    console.log("Token length:", token.length);
    const { data: { user: caller }, error: callerErr } = await adminClient.auth.getUser(token);
    console.log("Caller:", caller?.id, "Error:", callerErr?.message);
    if (callerErr || !caller) {
      console.error("JWT verify error:", callerErr);
      return new Response(JSON.stringify({ error: `Unauthorized - ${callerErr?.message ?? "no user"}` }), { status: 401, headers });
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

    const { name, email, phone, role, city, department_notes, password } = await req.json();
    if (!name || !email || !role || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers });
    }

    // Create auth user
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "Failed to create user" }), { status: 400, headers });
    }

    const userId = created.user.id;

    // Create profile
    const { error: profileErr } = await adminClient.from("profiles").upsert({
      user_id: userId,
      name,
      email,
      phone: phone ?? null,
      city: city ?? null,
      department_notes: department_notes ?? null,
      status: "active",
      profile_completed: false,
    }, { onConflict: "user_id" });

    if (profileErr) console.error("Profile upsert error:", profileErr);

    // Assign role
    const { error: roleErr } = await adminClient.from("user_roles").insert({ user_id: userId, role });
    if (roleErr) console.error("Role insert error:", roleErr);

    return new Response(JSON.stringify({ success: true, user_id: userId }), { status: 200, headers });
  } catch (err) {
    console.error("create-employee error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers });
  }
});
