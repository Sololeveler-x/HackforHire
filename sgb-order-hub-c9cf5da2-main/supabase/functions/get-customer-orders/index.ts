// Edge function: get-customer-orders
// Uses service role to fetch orders by phone (bypasses RLS)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits.slice(-10);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone } = await req.json();
    if (!phone) return new Response(JSON.stringify({ error: "phone required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const normalized = normalizePhone(phone);

    // Simple exact match — phone stored as 10 digits
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*, order_items(*), shipping(tracking_id, shipped_at)")
      .eq("phone", normalized)
      .order("created_at", { ascending: false });

    console.log("Orders query:", normalized, "result:", orders?.length, "error:", ordersError);

    // Loyalty (optional — may not exist)
    let loyalty = null;
    try {
      const { data } = await supabase
        .from("customer_loyalty")
        .select("*")
        .or(`customer_phone.eq.${normalized},customer_phone.eq.+91${normalized}`)
        .single();
      loyalty = data;
    } catch { /* table may not exist */ }

    return new Response(JSON.stringify({ orders: orders ?? [], loyalty, debug_phone: normalized, debug_count: orders?.length ?? 0, debug_error: ordersError?.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
