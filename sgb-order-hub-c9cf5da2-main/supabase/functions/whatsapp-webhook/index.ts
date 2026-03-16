// Supabase Edge Function: whatsapp-webhook
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendWhatsApp(to: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const creds = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${creds}` },
    body: new URLSearchParams({ From: TWILIO_WHATSAPP_FROM, To: to, Body: body }),
  });
  if (!res.ok) console.error("Twilio send error:", await res.text());
}

function detectSource(message: string): "whatsapp_ad" | "whatsapp_direct" {
  const adKeywords = ["ad", "offer", "saw your", "advertisement", "promotion", "discount", "deal", "poster", "banner", "flyer"];
  return adKeywords.some((kw) => message.toLowerCase().includes(kw)) ? "whatsapp_ad" : "whatsapp_direct";
}

// ── Multi-product OrderData ───────────────────────────────────────────────────
interface OrderData {
  is_order: boolean;
  customer_name: string | null;
  phone: string | null;
  city: string | null;
  notes: string | null;
  products: Array<{ product_name: string; quantity: number }>;
}

async function extractOrderWithGroq(message: string, senderPhone: string): Promise<OrderData> {
  const prompt = `You are an order extraction assistant for SGB Agro Industries. Extract order details from this WhatsApp message.

Message: "${message}"
Sender phone: "${senderPhone}"

Return ONLY a valid JSON object with NO markdown, NO explanation:
{
  "is_order": true or false,
  "customer_name": "name or null",
  "phone": "phone number",
  "city": "delivery city or null",
  "notes": "additional notes or null",
  "products": [
    {
      "product_name": "product name",
      "quantity": 1
    }
  ]
}

SGB Agro Industries sells ONLY these products:
- SGB Brush Cutter Trolley (₹3,999)
- SGB BC-520 Brush Cutter (₹13,000)
- SGB G45L Brush Cutter (₹13,000)
- SGB Cycle Weeder (₹3,499)
- SGB Carry Cart (₹50,000)
- SGB Wheel Barrow (₹6,500)

Map customer's product mentions to the closest official product name above.
IMPORTANT: Extract ALL products mentioned. Set is_order true if message mentions wanting to buy/order anything.`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 400,
    }),
  });

  if (!res.ok) throw new Error(`Groq API error: ${await res.text()}`);
  const data = JSON.parse(await res.text());
  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as OrderData;
  // Ensure products is always an array
  if (!Array.isArray(parsed.products)) parsed.products = [];
  return parsed;
}

Deno.serve(async (req: Request) => {
  const ok = new Response("OK", { status: 200 });
  try {
    if (req.method !== "POST") return ok;
    const params = new URLSearchParams(await req.text());
    const body = params.get("Body") ?? "";
    const from = params.get("From") ?? "";
    if (!body || !from) return ok;

    console.log(`Incoming WhatsApp from ${from}: ${body}`);

    // Quick check: if message is too short or has no order intent, skip Groq entirely
    const lowerBody = body.toLowerCase().trim();
    const hasOrderIntent = ['want', 'need', 'order', 'buy', 'purchase', 'deliver', 'send me', 'i want', 'i need']
      .some(kw => lowerBody.includes(kw));

    if (!hasOrderIntent || body.length < 10) {
      await sendWhatsApp(from,
        `Hi! 👋 Welcome to SGB Agro Industries!\n\nWe manufacture agricultural equipment in Koppa, Karnataka.\n\nTo place an order send:\n"I want [product] [qty] delivered to [city]"\n\nExample: "I want 2 SGB Cycle Weeders delivered to Mysuru"\n\nOur products:\n🔧 SGB Brush Cutter Trolley — ₹3,999\n🔧 SGB BC-520 Brush Cutter — ₹13,000\n🔧 SGB G45L Brush Cutter — ₹13,000\n🌱 SGB Cycle Weeder — ₹3,499\n🛒 SGB Carry Cart — ₹50,000\n🪣 SGB Wheel Barrow — ₹6,500\n\n📞 08277009667`
      );
      return ok;
    }

    let orderData: OrderData;
    try {
      orderData = await extractOrderWithGroq(body, from);
    } catch (e) {
      console.error("Groq extraction failed:", e);
      await sendWhatsApp(from, "Sorry, we couldn't process your message right now. Please try again later.");
      return ok;
    }

    if (!orderData.is_order) {
      await sendWhatsApp(from,
        `Hi! 👋 Welcome to SGB Agro Industries!\n\nWe manufacture agricultural equipment in Koppa, Karnataka.\n\nTo place an order send:\n"I want [product] [qty] delivered to [city]"\n\nExample: "I want 2 SGB Cycle Weeders delivered to Mysuru"\n\nOur products:\n🔧 SGB Brush Cutter Trolley — ₹3,999\n🔧 SGB BC-520 Brush Cutter — ₹13,000\n🔧 SGB G45L Brush Cutter — ₹13,000\n🌱 SGB Cycle Weeder — ₹3,499\n🛒 SGB Carry Cart — ₹50,000\n🪣 SGB Wheel Barrow — ₹6,500\n\n📞 08277009667`
      );
      return ok;
    }

    const source = detectSource(body);
    const phoneClean = from.replace('whatsapp:+91', '').replace('whatsapp:', '').replace('+91', '').replace(/\D/g, '').slice(-10);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const firstProduct = orderData.products[0]?.product_name ?? '';

    // Duplicate check: same phone + same exact product name within 2 hours
    // Fetch recent open inquiries for this phone, then check product name in JS (not SQL ilike)
    const { data: recentInquiries } = await supabase
      .from('inquiries')
      .select('id, status, created_at, product_name')
      .ilike('phone_number', `%${phoneClean}%`)
      .gte('created_at', twoHoursAgo)
      .not('status', 'in', '(closed,not_interested,delivered,cancelled)')
      .order('created_at', { ascending: false })
      .limit(10);

    // Only block if the exact same product name appears in a recent inquiry
    const existing = firstProduct
      ? recentInquiries?.find(inq =>
          inq.product_name.toLowerCase().includes(firstProduct.toLowerCase())
        )
      : null;

    if (existing) {
      await sendWhatsApp(from,
        `Hi! We already received your inquiry for ${existing.product_name} recently.\n📋 Reference ID: #${existing.id.slice(0, 8).toUpperCase()}\n\nOur team will contact you shortly. For a different product, please send a new message! 🌾`
      );
      return ok;
    }

    // Build product_name summary and total quantity
    const productSummary = orderData.products.map(p => `${p.quantity}x ${p.product_name}`).join(', ');
    const totalQty = orderData.products.reduce((sum, p) => sum + p.quantity, 0);

    const { data: inserted, error: dbError } = await supabase
      .from("inquiries")
      .insert({
        customer_name: orderData.customer_name ?? "Unknown",
        phone_number: phoneClean,
        product_name: productSummary || "Not specified",
        products_json: orderData.products,
        quantity: totalQty || null,
        delivery_city: orderData.city ?? "Not specified",
        raw_message: body,
        source,
        status: "new",
        assigned_to: null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      await sendWhatsApp(from, "We received your order but had trouble saving it. Our team will contact you shortly.");
      return ok;
    }

    console.log("Inquiry saved:", inserted?.id);

    const productList = orderData.products.map(p => `  • ${p.product_name} × ${p.quantity}`).join('\n');
    const confirmMsg =
      `✅ Order Received! Thank you${orderData.customer_name ? `, ${orderData.customer_name}` : ""}!\n\n` +
      `📦 Products Ordered:\n${productList}\n\n` +
      `📍 Delivery City: ${orderData.city ?? "Not specified"}\n\n` +
      `Your inquiry has been registered with SGB Agro Industries! 🌾\nOur sales team will call you to confirm pricing and delivery.\n\n` +
      `Smart Machines. Simple Farming. Stronger Farmers. 💪\n📞 08277009667`;

    await sendWhatsApp(from, confirmMsg);
    return ok;
  } catch (err) {
    console.error("Unhandled error:", err);
    return ok;
  }
});
