// WhatsApp notification utility — routes through Supabase edge function to avoid CORS

import { supabase } from '@/integrations/supabase/client';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FOOTER = `\n\nSGB Agro Industries\n📞 08277009667 | www.sgbagroindustries.com`;

// FIX 7: Retry logic with failure logging
async function sendWhatsAppViaEdgeFunction(phone: string, message: string): Promise<boolean> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ phone, message }),
      });
      const data = await res.json();
      if (data.skipped) {
        console.warn('WhatsApp skipped:', data.reason, '| phone:', phone);
        return false; // skipped is not a retriable error
      }
      if (data.success) {
        console.log(`WhatsApp sent ✅ attempt ${attempt} | SID:`, data.sid, '| phone:', phone);
        return true;
      }
      console.warn(`WhatsApp attempt ${attempt} failed:`, data);
    } catch (e) {
      console.error(`WhatsApp attempt ${attempt} error:`, e);
    }
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  // All retries exhausted — log to DB for admin visibility
  try {
    await (supabase as any).from('notification_failures').insert({
      phone,
      message_preview: message.slice(0, 100),
      failed_at: new Date().toISOString(),
      attempts: maxRetries,
    });
  } catch { /* silent — don't throw on logging failure */ }

  return false;
}

// ── Exported notification functions ──────────────────────────────────────────

export async function sendPackedNotification(phone: string, name: string, trackingId: string): Promise<void> {
  const trackingUrl = `${window.location.origin}/track/${trackingId}`;
  const msg =
    `📦 Your order has been packed!\n\n` +
    `Hi ${name}, your SGB Agro Industries order is packed and ready for dispatch.\n` +
    `Order Ref: ${trackingId.substring(0, 8).toUpperCase()}\n` +
    `🔗 Track here: ${trackingUrl}` +
    FOOTER;
  await sendWhatsAppViaEdgeFunction(phone, msg);
}

export async function sendShippedNotification(
  phone: string,
  name: string,
  trackingId: string,
  provider = 'India Post'
): Promise<void> {
  const trackingUrl = `${window.location.origin}/track/${trackingId}`;
  const isVRL = provider === 'VRL Logistics';
  const providerLine = isVRL
    ? `Our delivery partner (VRL Logistics) will deliver to your door.`
    : `Your parcel will be available at your nearest sub post office.`;
  const days = isVRL ? '2–3 days' : '3–5 days';
  const carrierTrackUrl = isVRL
    ? `https://www.vrllogistics.com`
    : `https://www.indiapost.gov.in`;

  const msg =
    `🚚 Your order has been dispatched!\n\n` +
    `Hi ${name}, your SGB Agro Industries order is on its way!\n\n` +
    `Provider: ${provider}\n` +
    `${providerLine}\n\n` +
    `🔢 Tracking ID: ${trackingId}\n` +
    `🔗 Track: ${trackingUrl}\n` +
    `📦 Track with carrier: ${carrierTrackUrl}\n\n` +
    `Est. delivery: ${days}` +
    FOOTER;
  await sendWhatsAppViaEdgeFunction(phone, msg);
}


export async function sendOutForDeliveryNotification(phone: string, name: string, trackingId: string): Promise<void> {
  const trackingUrl = `${window.location.origin}/track/${trackingId}`;
  const msg =
    `🏃 Out for Delivery!\n\n` +
    `Hi ${name}, your SGB Agro Industries order is out for delivery today!\n` +
    `Please keep your phone handy. Our delivery partner will contact you shortly.\n` +
    `🔗 Track: ${trackingUrl}` +
    FOOTER;
  await sendWhatsAppViaEdgeFunction(phone, msg);
}

export async function sendDeliveredNotification(phone: string, name: string, trackingId: string): Promise<void> {
  const msg =
    `✅ Order Delivered!\n\n` +
    `Hi ${name}, your SGB Agro Industries order has been delivered successfully!\n` +
    `Order Ref: ${trackingId.substring(0, 8).toUpperCase()}\n\n` +
    `Thank you for your purchase. We hope you love your products! 🌾\n` +
    `For any issues, reply within 48 hours.` +
    FOOTER;
  await sendWhatsAppViaEdgeFunction(phone, msg);
}

export async function sendCancelledNotification(phone: string, name: string, reason: string): Promise<void> {
  const msg =
    `❌ Order Cancelled\n\n` +
    `Hi ${name}, your SGB Agro Industries order has been cancelled.\n` +
    `Reason: ${reason}\n\n` +
    `If this was a mistake or you'd like to reorder, please contact us.` +
    FOOTER;
  await sendWhatsAppViaEdgeFunction(phone, msg);
}

export async function sendCODReminderNotification(
  phone: string,
  name: string,
  amount: number,
  orderId: string,
  shippingCharge = 0,
  shippingProvider = 'India Post'
): Promise<void> {
  const productTotal = amount - shippingCharge;
  const breakdown = shippingCharge > 0
    ? `  Products: ₹${productTotal.toLocaleString()}\n  Shipping (${shippingProvider}): ₹${shippingCharge.toLocaleString()}\n  Total: ₹${amount.toLocaleString()}`
    : `  Total: ₹${amount.toLocaleString()}`;
  const msg =
    `💰 COD Payment Reminder\n\n` +
    `Hi ${name}, please keep the following amount ready for delivery of order ${orderId.substring(0, 8).toUpperCase()}:\n\n` +
    `${breakdown}\n\n` +
    `Please arrange exact change at the time of delivery. Thank you! 🙏` +
    FOOTER;
  await sendWhatsAppViaEdgeFunction(phone, msg);
}

export async function sendPaymentReminderBeforeShipping(
  phone: string,
  name: string,
  orderId: string,
  remaining: number,
  method: string
): Promise<void> {
  const msg =
    `⚠️ Payment Pending — Action Required\n\n` +
    `Hi ${name}, your order ${orderId.substring(0, 8).toUpperCase()} is ready to ship but ₹${remaining.toLocaleString()} is still unpaid.\n` +
    `Payment method: ${method}\n\n` +
    `Please complete payment so we can dispatch your order immediately.` +
    FOOTER;
  await sendWhatsAppViaEdgeFunction(phone, msg);
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  phone: string;
  address: string;
  items: Array<{ name: string; qty: number; price: number; total: number }>;
  subtotal: number;
  discount: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus?: string;
  upiId?: string;
  totalPaid?: number;
  remaining?: number;
  trackingId: string;
  trackingUrl: string;
  shippingProvider?: string;
  shippingCharge?: number;
  estimatedDays?: string;
}

export async function sendInvoiceWhatsApp(phone: string, inv: InvoiceData): Promise<void> {
  const itemLines = inv.items
    .map(i => `  - ${i.name} × ${i.qty} @ ₹${i.price.toLocaleString()} = ₹${i.total.toLocaleString()}`)
    .join('\n');

  const method = (inv.paymentMethod ?? '').toLowerCase();
  const status = (inv.paymentStatus ?? '').toLowerCase();
  let paymentLine: string;
  if (method === 'upi') {
    paymentLine = `✅ Payment Method: UPI\nStatus: PAID${inv.upiId ? `\nUPI ID: ${inv.upiId}` : ''}`;
  } else if (method === 'bank transfer') {
    paymentLine = `✅ Payment Method: Bank Transfer\nStatus: PAID`;
  } else if (method === 'cash on delivery' || method === 'cod' || status === 'cod_pending') {
    paymentLine = `💵 Payment Method: Cash on Delivery\nStatus: ⏳ To collect ₹${inv.grandTotal.toLocaleString()} on delivery`;
  } else if (method === 'cheque' || status === 'cheque_pending') {
    paymentLine = `📃 Payment Method: Cheque\nStatus: ⏳ Cheque to be collected`;
  } else {
    paymentLine = `💳 Payment Method: ${inv.paymentMethod}\nStatus: ${status === 'paid' ? '✅ PAID' : '⏳ Pending'}`;
  }

  const msg =
    `🧾 INVOICE — SGB Agro Industries\n\n` +
    `Invoice #: ${inv.invoiceNumber}\n` +
    `Date: ${inv.date}\n` +
    `Customer: ${inv.customerName} | ${inv.phone}\n` +
    `Address: ${inv.address}\n\n` +
    `📦 ITEMS:\n${itemLines}\n\n` +
    `Subtotal: ₹${inv.subtotal.toLocaleString()}\n` +
    (inv.discount > 0 ? `Discount: -₹${inv.discount.toLocaleString()}\n` : '') +
    (inv.shippingCharge && inv.shippingCharge > 0
      ? `Shipping (${inv.shippingProvider ?? 'India Post'}): +₹${inv.shippingCharge.toLocaleString()}\n`
      : '') +
    `Grand Total: ₹${inv.grandTotal.toLocaleString()}\n\n` +
    (inv.shippingProvider
      ? `🚚 Shipping via ${inv.shippingProvider}. Est. delivery: ${inv.estimatedDays ?? (inv.shippingProvider === 'VRL Logistics' ? '2–3 days' : '3–5 days')}\n\n`
      : '') +
    `${paymentLine}\n\n` +
    (inv.trackingUrl ? `🔍 Track your order: ${inv.trackingUrl}\n\n` : '') +
    `Thank you for choosing SGB Agro Industries! 🌾\n` +
    `Smart Machines. Simple Farming. Stronger Farmers.` +
    FOOTER;

  await sendWhatsAppViaEdgeFunction(phone, msg);
}

export async function sendSplitOrderNotification(
  phone: string,
  name: string,
  shipments: Array<{ warehouseName: string; items: Array<{ productName: string; quantity: number }>; estimatedDeliveryDate: string }>
): Promise<void> {
  const shipmentLines = shipments.map((s, i) =>
    `Shipment ${i + 1} from ${s.warehouseName}:\n` +
    s.items.map(item => `  - ${item.quantity}× ${item.productName}`).join('\n') +
    `\n  Est. delivery: ${s.estimatedDeliveryDate}`
  ).join('\n\n');

  const msg =
    `📦 Your order is arriving in ${shipments.length} shipments!\n\n` +
    `Hi ${name},\n\n${shipmentLines}` +
    FOOTER;
  await sendWhatsAppViaEdgeFunction(phone, msg);
}

// ── Legacy aliases (keep existing callers working) ────────────────────────────
export const notifyOrderPacked = (name: string, phone: string, orderId: string) =>
  sendPackedNotification(phone, name, orderId);

export const notifyOrderShipped = (name: string, phone: string, provider: string, trackingId: string) =>
  sendShippedNotification(phone, name, trackingId, provider);

export const notifyOutForDelivery = (name: string, phone: string, trackingId = '') =>
  sendOutForDeliveryNotification(phone, name, trackingId);

export const notifyOrderDelivered = (name: string, phone: string, trackingId = '') =>
  sendDeliveredNotification(phone, name, trackingId);

export const notifyOrderCancelled = (name: string, phone: string, reason: string) =>
  sendCancelledNotification(phone, name, reason);

export const notifyCODReminder = (name: string, phone: string, amount: number) =>
  sendCODReminderNotification(phone, name, amount, '', 0, 'India Post');
