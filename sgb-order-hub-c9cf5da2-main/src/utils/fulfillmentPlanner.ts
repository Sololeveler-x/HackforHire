import { supabase } from '@/integrations/supabase/client';
import { haversineDistance, getCityCoords, estimateDeliveryDays } from './geoUtils';

export interface FulfillmentPlan {
  type: 'single' | 'split';
  shipments: Shipment[];
  explanation: string;
  totalDeliveryDays: number;
}

export interface Shipment {
  warehouseId: string;
  warehouseName: string;
  warehouseCity: string;
  distanceKm: number;
  deliveryDays: number;
  estimatedDeliveryDate: string;
  items: ShipmentItem[];
}

export interface ShipmentItem {
  productId: string;
  productName: string;
  quantity: number;
}

export async function planFulfillment(
  _orderId: string,
  customerCity: string,
  orderItems: Array<{ product_id: string; quantity: number; product_name?: string }>
): Promise<FulfillmentPlan> {
  const db = supabase as any;

  // Get all warehouses with coordinates
  const { data: warehouses } = await db
    .from('warehouses')
    .select('id, warehouse_name, city, latitude, longitude');

  if (!warehouses?.length) throw new Error('No warehouses found');

  // Get inventory for all products
  const productIds = orderItems.map(i => i.product_id);
  const { data: inventory } = await db
    .from('warehouse_inventory')
    .select('warehouse_id, product_id, stock_quantity')
    .in('product_id', productIds);

  const customerCoords = getCityCoords(customerCity) ?? [12.9716, 77.5946] as [number, number];

  const warehousesWithDistance = warehouses.map((w: any) => {
    const lat = w.latitude ?? getCityCoords(w.city)?.[0] ?? 13.5333;
    const lon = w.longitude ?? getCityCoords(w.city)?.[1] ?? 75.3667;
    const distanceKm = haversineDistance(lat, lon, customerCoords[0], customerCoords[1]);
    const deliveryDays = estimateDeliveryDays(distanceKm);

    const stockMap: Record<string, number> = {};
    (inventory ?? [])
      .filter((inv: any) => inv.warehouse_id === w.id)
      .forEach((inv: any) => { stockMap[inv.product_id] = inv.stock_quantity; });

    return { ...w, distanceKm, deliveryDays, stockMap };
  }).sort((a: any, b: any) => a.distanceKm - b.distanceKm);

  // Try single warehouse fulfillment (prefer closest)
  for (const warehouse of warehousesWithDistance) {
    const canFulfillAll = orderItems.every(
      item => (warehouse.stockMap[item.product_id] ?? 0) >= item.quantity
    );

    if (canFulfillAll) {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + warehouse.deliveryDays);

      return {
        type: 'single',
        explanation: `All items available at ${warehouse.warehouse_name} (${Math.round(warehouse.distanceKm)}km away). Estimated delivery in ${warehouse.deliveryDays} day(s).`,
        totalDeliveryDays: warehouse.deliveryDays,
        shipments: [{
          warehouseId: warehouse.id,
          warehouseName: warehouse.warehouse_name,
          warehouseCity: warehouse.city ?? '',
          distanceKm: warehouse.distanceKm,
          deliveryDays: warehouse.deliveryDays,
          estimatedDeliveryDate: deliveryDate.toISOString().split('T')[0],
          items: orderItems.map(item => ({
            productId: item.product_id,
            productName: item.product_name ?? 'Product',
            quantity: item.quantity,
          })),
        }],
      };
    }
  }

  // Need split — try Groq AI first, fallback to greedy
  return planSplitWithGroq(orderItems, warehousesWithDistance, customerCity);
}

async function planSplitWithGroq(
  orderItems: any[],
  warehouses: any[],
  customerCity: string
): Promise<FulfillmentPlan> {
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

  const warehouseData = warehouses.map((w: any) => ({
    id: w.id,
    name: w.warehouse_name,
    city: w.city,
    distanceKm: Math.round(w.distanceKm),
    deliveryDays: w.deliveryDays,
    stock: Object.entries(w.stockMap).map(([productId, qty]) => {
      const item = orderItems.find((i: any) => i.product_id === productId);
      return { productId, productName: item?.product_name ?? 'Unknown', available: qty };
    }).filter((s: any) => (s.available as number) > 0),
  }));

  const orderData = orderItems.map((item: any) => ({
    productId: item.product_id,
    productName: item.product_name ?? 'Product',
    needed: item.quantity,
  }));

  const prompt = `You are a fulfillment optimizer for SGB Agro Industries. Plan the optimal warehouse split.

Customer city: ${customerCity}
Order needed: ${JSON.stringify(orderData)}
Warehouses (sorted by distance): ${JSON.stringify(warehouseData)}

Rules:
1. Minimize shipments (prefer 1, then 2)
2. Prefer closer warehouses
3. Never exceed available stock
4. Every item must be fulfilled

Return ONLY valid JSON:
{"explanation":"reason","shipments":[{"warehouseId":"uuid","warehouseName":"name","warehouseCity":"city","distanceKm":45,"deliveryDays":2,"items":[{"productId":"uuid","productName":"name","quantity":10}]}]}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const plan = JSON.parse(cleaned);

    const maxDays = Math.max(...plan.shipments.map((s: any) => s.deliveryDays ?? 3));
    const shipments: Shipment[] = plan.shipments.map((s: any) => {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + (s.deliveryDays ?? 3));
      return { ...s, estimatedDeliveryDate: deliveryDate.toISOString().split('T')[0] };
    });

    return { type: 'split', explanation: plan.explanation, totalDeliveryDays: maxDays, shipments };
  } catch {
    return greedySplit(orderItems, warehouses, customerCity);
  }
}

function greedySplit(orderItems: any[], warehouses: any[], _customerCity: string): FulfillmentPlan {
  const remaining: Record<string, number> = {};
  orderItems.forEach((item: any) => { remaining[item.product_id] = item.quantity; });

  const shipments: Shipment[] = [];

  for (const warehouse of warehouses) {
    const warehouseItems: ShipmentItem[] = [];

    for (const [productId, needed] of Object.entries(remaining)) {
      const available = warehouse.stockMap[productId] ?? 0;
      if (available <= 0 || needed <= 0) continue;
      const take = Math.min(available, needed as number);
      remaining[productId] = (needed as number) - take;
      const item = orderItems.find((i: any) => i.product_id === productId);
      warehouseItems.push({ productId, productName: item?.product_name ?? 'Product', quantity: take });
    }

    if (warehouseItems.length > 0) {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + warehouse.deliveryDays);
      shipments.push({
        warehouseId: warehouse.id,
        warehouseName: warehouse.warehouse_name,
        warehouseCity: warehouse.city ?? '',
        distanceKm: warehouse.distanceKm,
        deliveryDays: warehouse.deliveryDays,
        estimatedDeliveryDate: deliveryDate.toISOString().split('T')[0],
        items: warehouseItems,
      });
    }

    if (Object.values(remaining).every(q => q <= 0)) break;
  }

  const maxDays = shipments.length > 0 ? Math.max(...shipments.map(s => s.deliveryDays)) : 3;
  return {
    type: 'split',
    explanation: `Order split across ${shipments.length} warehouse(s) based on stock availability and distance.`,
    totalDeliveryDays: maxDays,
    shipments,
  };
}
