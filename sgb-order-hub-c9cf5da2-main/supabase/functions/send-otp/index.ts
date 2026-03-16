// Supabase Edge Function: send-otp
// Generates 4-digit OTP, saves to customer_otps, sends via Twilio WhatsApp

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886";
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

async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  if (!TWILIO_AUTH_TOKEN) {
    console.warn("TWILIO_AUTH_TOKEN not set");
    return false;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const creds = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${creds}`,
    },
    body: new URLSearchParams({ From: TWILIO_WHATSAPP_FROM, To: to, Body: body }),
  });
  const data = await res.json();
  console.log("Twilio OTP response:", res.status, JSON.stringify(data));
  return res.ok;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    if (!phone) {
      return new Response(JSON.stringify({ error: "Phone number required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = normalizePhone(phone);
    const whatsappTo = `whatsapp:+91${normalized}`;

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Save OTP to database
    const { error: dbError } = await supabase.from("customer_otps").insert({
      phone: normalized,
      otp,
      expires_at: expiresAt,
      used: false,
    });

    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to save OTP" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = `🔐 Your SGB Agro Industries verification code is: *${otp}*\n\nValid for 10 minutes. Do not share this code.\n\n📞 08277009667`;
    const sent = await sendWhatsApp(whatsappTo, message);

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
