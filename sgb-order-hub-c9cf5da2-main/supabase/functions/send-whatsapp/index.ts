// Supabase Edge Function: send-whatsapp
// Sends WhatsApp messages via Twilio — called from frontend to avoid CORS

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Strip leading 91 if 12 digits, keep last 10
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits.slice(-10);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "phone and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = normalizePhone(phone);
    const to = `whatsapp:+91${normalized}`;

    console.log(`Sending WhatsApp to ${to}`);
    console.log(`Message: ${message.substring(0, 100)}...`);

    if (!TWILIO_AUTH_TOKEN) {
      console.warn("TWILIO_AUTH_TOKEN not set — skipping send");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_auth_token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const creds = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${creds}`,
      },
      body: new URLSearchParams({ From: TWILIO_WHATSAPP_FROM, To: to, Body: message }),
    });

    const data = await res.json();
    console.log("Twilio response status:", res.status);
    console.log("Twilio response:", JSON.stringify(data));

    // 63003 = number not in sandbox — log but return success so UI doesn't break
    if (data.code === 63003) {
      console.warn("Phone not in Twilio sandbox:", to);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "not_in_sandbox" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!res.ok) {
      console.error("Twilio error:", data);
      return new Response(JSON.stringify({ success: false, error: data.message }), {
        status: 200, // Return 200 so UI doesn't break
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, sid: data.sid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
