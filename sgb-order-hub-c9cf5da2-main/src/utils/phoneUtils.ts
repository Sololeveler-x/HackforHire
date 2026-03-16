// FIX 5: Phone number normalization utilities

/**
 * Normalize a phone number to E.164-ish format (digits only, with country code)
 * Handles Indian numbers: strips spaces, dashes, +91, 0 prefix
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  // Strip leading 91 if 12 digits (Indian country code)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  // Strip leading 0
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Convert a phone number to WhatsApp-compatible format: whatsapp:+91XXXXXXXXXX
 */
export function toWhatsAppFormat(phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return '';
  // If already 10 digits (Indian mobile), prepend +91
  if (normalized.length === 10) return `whatsapp:+91${normalized}`;
  // If already has country code (12 digits starting with 91)
  if (normalized.length === 12 && normalized.startsWith('91')) return `whatsapp:+${normalized}`;
  return `whatsapp:+${normalized}`;
}

/**
 * Format for display: +91 XXXXX XXXXX
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.length === 10) {
    return `+91 ${normalized.slice(0, 5)} ${normalized.slice(5)}`;
  }
  return phone;
}
