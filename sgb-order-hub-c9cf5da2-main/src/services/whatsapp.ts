// WhatsApp Notification Service using Twilio
// For ANVESHANA HACK FOR HIRE Hackathon

export interface WhatsAppNotificationData {
  customerName: string;
  phone: string;
  courierName: string;
  trackingId: string;
  trackingUrl?: string;
  orderId?: string;
}

/**
 * Send WhatsApp notification when order is shipped
 * Uses Twilio WhatsApp Sandbox for demo/testing
 */
export const sendWhatsAppNotification = async (data: WhatsAppNotificationData): Promise<boolean> => {
  const { customerName, phone, courierName, trackingId, trackingUrl } = data;

  // Get Twilio credentials from environment
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
  const fromNumber = import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER;

  // Check if credentials are configured
  if (!accountSid || !authToken || !fromNumber) {
    console.warn('Twilio credentials not configured. Skipping WhatsApp notification.');
    console.log('To enable automatic WhatsApp notifications, add these to your .env file:');
    console.log('VITE_TWILIO_ACCOUNT_SID=your_account_sid');
    console.log('VITE_TWILIO_AUTH_TOKEN=your_auth_token');
    console.log('VITE_TWILIO_WHATSAPP_NUMBER=+14155238886');
    return false;
  }

  try {
    // Format phone number for WhatsApp (must include country code)
    const cleanedPhone = phone.replace(/\D/g, ''); // Remove non-digits
    const toNumber = `whatsapp:+91${cleanedPhone}`; // Add India country code
    const from = `whatsapp:${fromNumber}`;

    // Create message with tracking URL
    const trackingLink = trackingUrl || `${window.location.origin}/track/${trackingId}`;
    const message = `Hello ${customerName},

Your order has been shipped! 🚚

Courier Partner: ${courierName}
Tracking ID: ${trackingId}

Track your shipment here: ${trackingLink}

Thank you for shopping with us.
- SGB Agro Industries`;

    // Send via Twilio API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
        },
        body: new URLSearchParams({
          From: from,
          To: toNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Twilio API error:', errorData);
      throw new Error(`Twilio API error: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ WhatsApp notification sent successfully:', result.sid);
    return true;
  } catch (error) {
    console.error('❌ Failed to send WhatsApp notification:', error);
    // Don't throw - we don't want to fail the shipment if WhatsApp fails
    return false;
  }
};

/**
 * Validate phone number format
 */
export const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  // Indian mobile numbers are 10 digits
  return cleaned.length === 10;
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

/**
 * Generate WhatsApp message for order shipment
 */
export const generateShipmentWhatsAppMessage = (
  customerName: string,
  courierPartner: string,
  trackingId: string,
  trackingUrl: string
): string => {
  const message = `Hello ${customerName},

Your order has been shipped! 🚚

Courier Partner: ${courierPartner}
Tracking ID: ${trackingId}

Track your shipment here: ${trackingUrl}

Thank you for shopping with us.
- SGB Agro Industries`;

  return encodeURIComponent(message);
};

/**
 * Generate WhatsApp click-to-chat URL
 */
export const generateWhatsAppUrl = (phone: string, message: string): string => {
  // Remove any non-digit characters from phone
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Add country code if not present (assuming India +91)
  const phoneWithCountryCode = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  
  return `https://wa.me/${phoneWithCountryCode}?text=${message}`;
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};
