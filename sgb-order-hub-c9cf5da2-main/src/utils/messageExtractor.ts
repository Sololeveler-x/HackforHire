// WhatsApp Message Information Extraction Utility

export interface ExtractedData {
  customerName: string;
  phoneNumber: string;
  productName: string;
  quantity: number | null;
  deliveryCity: string;
}

// Known cities from logistics database
const KNOWN_CITIES = [
  'Bangalore', 'Mangalore', 'Hubli', 'Mysore', 'Shivamogga', 
  'Koppa', 'Belgaum', 'Davangere', 'Tumkur', 'Bellary'
];

// SGB Agro Industries official product keywords
const PRODUCT_KEYWORDS = [
  'brush cutter trolley', 'bc-520', 'bc520', 'g45l', 'carry cart',
  'cycle weeder', 'wheel barrow', 'wheelbarrow', 'brush cutter',
  'weeder', 'cart', 'barrow'
];

export function extractPhoneNumber(message: string): string {
  // Match 10-digit phone numbers
  const phonePattern = /\b\d{10}\b/g;
  const matches = message.match(phonePattern);
  return matches ? matches[0] : '';
}

export function extractName(message: string): string {
  // Pattern 1: "Name: Ramesh" or "name: ramesh"
  let nameMatch = message.match(/name\s*:\s*([a-zA-Z\s]+)/i);
  if (nameMatch) {
    return nameMatch[1].trim();
  }

  // Pattern 2: "My name is Ramesh" or "I am Ramesh"
  nameMatch = message.match(/(?:my name is|i am|this is)\s+([a-zA-Z\s]+)/i);
  if (nameMatch) {
    return nameMatch[1].trim().split(/\s+/).slice(0, 3).join(' ');
  }

  return '';
}

export function extractQuantity(message: string): number | null {
  // Match patterns like "20 pipes", "50 cement bags", "10 brush cutters"
  const quantityPattern = /\b(\d+)\s*(?:pieces?|pcs?|units?|bags?|boxes?|pipes?|rods?|cutters?)?/gi;
  const matches = message.match(quantityPattern);
  
  if (matches && matches.length > 0) {
    const firstMatch = matches[0].match(/\d+/);
    return firstMatch ? parseInt(firstMatch[0]) : null;
  }
  
  return null;
}

export function extractProduct(message: string, availableProducts: string[] = []): string {
  const lowerMessage = message.toLowerCase();
  
  // First, try to match against available products from database
  for (const product of availableProducts) {
    if (lowerMessage.includes(product.toLowerCase())) {
      return product;
    }
  }
  
  // Fallback: Match against common product keywords
  for (const keyword of PRODUCT_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }
  
  return '';
}

export function extractCity(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Check for delivery-related patterns
  const deliveryPattern = /(?:deliver(?:ed)?\s+to|delivery\s+(?:to|at|in)|ship(?:ped)?\s+to|send\s+to)\s+([a-zA-Z\s]+)/i;
  const deliveryMatch = message.match(deliveryPattern);
  
  if (deliveryMatch) {
    const cityText = deliveryMatch[1].trim();
    for (const city of KNOWN_CITIES) {
      if (cityText.toLowerCase().includes(city.toLowerCase())) {
        return city;
      }
    }
  }
  
  // Fallback: Check if any known city is mentioned anywhere in the message
  for (const city of KNOWN_CITIES) {
    if (lowerMessage.includes(city.toLowerCase())) {
      return city;
    }
  }
  
  return '';
}

export function extractAllData(message: string, availableProducts: string[] = []): ExtractedData {
  return {
    customerName: extractName(message),
    phoneNumber: extractPhoneNumber(message),
    productName: extractProduct(message, availableProducts),
    quantity: extractQuantity(message),
    deliveryCity: extractCity(message)
  };
}
