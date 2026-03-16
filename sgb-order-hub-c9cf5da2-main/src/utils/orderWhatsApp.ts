// Shared utility for sending order status WhatsApp messages via Twilio

const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID ?? '';
const TWILIO_FROM = 'whatsapp:+14155238886';

const messages = {
  packed: (customerName: string, trackingId: string, trackingUrl: string) =>
    `📦 Hello ${customerName}! Your order has been packed at our warehouse and is ready for dispatch.\n\nTracking ID: ${trackingId}\nTrack your order: ${trackingUrl}`,
  shipped: (customerName: string, trackingId: string, trackingUrl: string) =>
    `🚚 Hello ${customerName}! Your order is on the way!\n\nTracking ID: ${trackingId}\nTrack live: ${trackingUrl}\n\nEstimated delivery: 2-3 business days`,
  out_for_delivery: (_customerName: string, _trackingId: string, trackingUrl: string) =>
    `🏠 Your order will be delivered TODAY!\n\nOur delivery partner is on the way to you.\nTrack live: ${trackingUrl}`,
  delivered: (customerName: string, _trackingId: string, _trackingUrl: string) =>
    `✅ Hello ${customerName}! Your order has been delivered!\n\nThank you for choosing SGB Agro Industries. 🌾\n\nFor any issues, reply to this message or call us.`,
};

export async function sendOrderStatusWhatsApp(
  customerPhone: string,
  customerName: string,
  status: keyof typeof messages,
  trackingId: string,
  trackingUrl?: string,
): Promise<void> {
  const url = trackingUrl ?? `${window.location.origin}/track/${trackingId}`;
  const body = messages[status](customerName, trackingId, url);

  // Use Twilio REST API via fetch
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
  if (!authToken) {
    // Fallback: open WhatsApp web
    const phone = customerPhone.replace(/\D/g, '');
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(body)}`, '_blank');
    return;
  }

  const formData = new URLSearchParams();
  formData.append('From', TWILIO_FROM);
  formData.append('To', `whatsapp:+91${customerPhone.replace(/\D/g, '')}`);
  formData.append('Body', body);

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    },
  );
}

export function openWhatsAppWithMessage(phone: string, message: string) {
  const clean = phone.replace(/\D/g, '');
  window.open(`https://wa.me/91${clean}?text=${encodeURIComponent(message)}`, '_blank');
}
