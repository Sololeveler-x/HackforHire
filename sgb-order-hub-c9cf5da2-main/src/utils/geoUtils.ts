// City coordinates for Karnataka/India cities
export const cityCoords: Record<string, [number, number]> = {
  'Koppa': [13.5333, 75.3667],
  'Chikmagalur': [13.3161, 75.7720],
  'Shimoga': [13.9299, 75.5681],
  'Shivamogga': [13.9299, 75.5681],
  'Sagara': [14.1667, 75.0167],
  'Sagar': [14.1667, 75.0167],
  'Hassan': [13.0033, 76.0998],
  'Mysuru': [12.2958, 76.6394],
  'Mysore': [12.2958, 76.6394],
  'Bangalore': [12.9716, 77.5946],
  'Bengaluru': [12.9716, 77.5946],
  'Mangalore': [12.8698, 74.8431],
  'Mangaluru': [12.8698, 74.8431],
  'Udupi': [13.3409, 74.7421],
  'Hubli': [15.3647, 75.1240],
  'Hubballi': [15.3647, 75.1240],
  'Dharwad': [15.4589, 75.0078],
  'Tumkur': [13.3409, 77.1010],
  'Tumakuru': [13.3409, 77.1010],
  'Mandya': [12.5218, 76.8951],
  'Belagavi': [15.8497, 74.4977],
  'Belgaum': [15.8497, 74.4977],
  'Kadur': [13.5522, 76.0154],
  'Mudigere': [13.1347, 75.6398],
  'Sringeri': [13.4260, 75.2568],
  'Madikeri': [12.4244, 75.7382],
  'Kodagu': [12.4244, 75.7382],
  'Chamarajanagar': [11.9237, 76.9437],
  'Kolar': [13.1367, 78.1301],
  'Ramanagara': [12.7157, 77.2819],
  'Davangere': [14.4644, 75.9218],
  'Davanagere': [14.4644, 75.9218],
  'Bellary': [15.1394, 76.9214],
  'Ballari': [15.1394, 76.9214],
  'Gulbarga': [17.3297, 76.8343],
  'Kalaburagi': [17.3297, 76.8343],
  'Bijapur': [16.8302, 75.7100],
  'Vijayapura': [16.8302, 75.7100],
  'Raichur': [16.2120, 77.3439],
  'Bidar': [17.9104, 77.5199],
  'Chitradurga': [14.2251, 76.3980],
  'Hospet': [15.2689, 76.3909],
  'Gadag': [15.4166, 75.6253],
  'Bagalkot': [16.1826, 75.6961],
  'Karwar': [14.8136, 74.1288],
  'Sirsi': [14.6218, 74.8367],
  'Mumbai': [19.0760, 72.8777],
  'Pune': [18.5204, 73.8567],
  'Hyderabad': [17.3850, 78.4867],
  'Chennai': [13.0827, 80.2707],
  'Goa': [15.2993, 74.1240],
};

export function getCityCoords(city: string): [number, number] | null {
  if (!city) return null;
  const key = Object.keys(cityCoords).find(
    k => k.toLowerCase() === city.toLowerCase().trim()
  );
  return key ? cityCoords[key] : null;
}

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateDeliveryDays(distanceKm: number): number {
  if (distanceKm < 30) return 1;
  if (distanceKm < 100) return 2;
  if (distanceKm < 300) return 3;
  return 5;
}

export function getWarehouseDistance(
  warehouseLat: number,
  warehouseLon: number,
  customerCity: string
): number {
  const customerCoords = getCityCoords(customerCity);
  if (!customerCoords) return 999;
  return haversineDistance(warehouseLat, warehouseLon, customerCoords[0], customerCoords[1]);
}

export interface RouteStop {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  distance?: number;
}

export function optimizeRoute(stops: RouteStop[]): RouteStop[] {
  if (stops.length <= 2) return stops;
  const origin = stops[0];
  const remaining = [...stops.slice(1)];
  const route: RouteStop[] = [origin];
  let current = origin;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    remaining.forEach((stop, i) => {
      const d = haversineDistance(current.lat, current.lng, stop.lat, stop.lng);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    });
    const next = { ...remaining[nearestIdx], distance: nearestDist };
    route.push(next);
    current = next;
    remaining.splice(nearestIdx, 1);
  }
  return route;
}

export function interpolatePosition(
  from: [number, number],
  to: [number, number],
  t: number
): [number, number] {
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
  ];
}

export function getStatusPercent(status: string): number {
  const map: Record<string, number> = {
    ready_for_packing: 0.1,
    ready_for_shipping: 0.3,
    shipped: 0.7,
    out_for_delivery: 0.9,
    delivered: 1.0,
  };
  return map[status] ?? 0.5;
}
