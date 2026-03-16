import { supabase } from '@/integrations/supabase/client';

export const SHIPPING_PROVIDERS = ['India Post', 'VRL Logistics'] as const;
export type ShippingProvider = typeof SHIPPING_PROVIDERS[number];

export function getProviderInfo(provider: string) {
  const info: Record<string, { description: string; tracking: string; note: string; days: string; icon: string }> = {
    'India Post': {
      description: 'India Post — Nearest Sub Post Office Delivery',
      tracking: 'https://www.indiapost.gov.in',
      note: 'Delivered to nearest sub post office. Customer may need to collect.',
      days: '3–5 days',
      icon: '📮',
    },
    'VRL Logistics': {
      description: 'VRL Logistics — Door step delivery',
      tracking: 'https://www.vrllogistics.com',
      note: 'Door to door delivery. Faster for Karnataka locations.',
      days: '2–3 days',
      icon: '🚛',
    },
  };
  return info[provider] ?? info['India Post'];
}

const KARNATAKA_CITIES = [
  'koppa', 'chikmagalur', 'shimoga', 'shivamogga', 'hassan', 'mysuru', 'mysore',
  'bangalore', 'bengaluru', 'mangalore', 'udupi', 'hubli', 'dharwad', 'tumkur',
  'mandya', 'belagavi', 'belgaum', 'kadur', 'mudigere', 'sringeri',
];

export function recommendProvider(customerCity: string, totalWeightKg: number, isUrgent: boolean): ShippingProvider {
  const isKarnataka = KARNATAKA_CITIES.includes(customerCity?.toLowerCase().trim());
  if (isKarnataka && (totalWeightKg > 10 || isUrgent)) return 'VRL Logistics';
  return 'India Post';
}

export async function calculateShippingCharge(
  customerCity: string,
  totalWeightKg: number,
  provider: string
): Promise<{ charge: number; zone: string; provider: string; note: string }> {
  const { data: rates } = await (supabase as any)
    .from('shipping_rates')
    .select('*')
    .eq('provider', provider);

  if (!rates?.length) {
    return { charge: 150, zone: 'Standard', provider, note: 'Standard rate applied' };
  }

  const matchedZone = rates.find((r: any) =>
    r.cities?.some((c: string) => c.toLowerCase() === customerCity?.toLowerCase().trim())
  );

  const rate = matchedZone ?? rates[rates.length - 1];
  const charge = Math.max(rate.min_charge, totalWeightKg * rate.rate_per_kg);

  return {
    charge: Math.round(charge),
    zone: rate.zone,
    provider: rate.provider,
    note: getProviderInfo(provider).note,
  };
}
