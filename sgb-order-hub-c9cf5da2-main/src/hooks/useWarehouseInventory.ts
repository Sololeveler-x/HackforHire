import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface WarehouseInventoryItem {
  id: string;
  warehouse_id: string;
  product_id: string;
  stock_quantity: number;
  reorder_level: number;
  updated_at: string;
  product_name?: string;
  warehouse_name?: string;
}

export function useWarehouseInventory(warehouseId: string) {
  return useQuery({
    queryKey: ['warehouse_inventory', warehouseId],
    enabled: !!warehouseId,
    queryFn: async () => {
      const { data, error } = await db
        .from('warehouse_inventory')
        .select('*, products(product_name, price), warehouses(warehouse_name)')
        .eq('warehouse_id', warehouseId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((item: any) => ({
        ...item,
        product_name: item.products?.product_name ?? '—',
        warehouse_name: item.warehouses?.warehouse_name ?? '—',
      })) as WarehouseInventoryItem[];
    },
  });
}

export function useUpsertWarehouseInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { warehouse_id: string; product_id: string; stock_quantity: number; reorder_level: number }[]) => {
      const { error } = await db
        .from('warehouse_inventory')
        .upsert(items, { onConflict: 'warehouse_id,product_id' });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['warehouse_inventory', vars[0]?.warehouse_id] });
    },
  });
}

export function useAddProductToWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ warehouse_id, product_id, stock_quantity, reorder_level }: {
      warehouse_id: string; product_id: string; stock_quantity: number; reorder_level: number;
    }) => {
      const { error } = await db
        .from('warehouse_inventory')
        .upsert({ warehouse_id, product_id, stock_quantity, reorder_level }, { onConflict: 'warehouse_id,product_id' });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['warehouse_inventory', vars.warehouse_id] });
    },
  });
}

// AI warehouse selector — picks best warehouse for an order
export async function selectBestWarehouse(customerCity: string, productId: string, quantity: number): Promise<string | null> {
  const { data, error } = await db
    .from('warehouse_inventory')
    .select('warehouse_id, stock_quantity, warehouses(city, warehouse_name)')
    .eq('product_id', productId)
    .gte('stock_quantity', quantity);
  if (error || !data || data.length === 0) return null;

  const city = customerCity.toLowerCase();
  let best: { warehouse_id: string; score: number } | null = null;

  for (const item of data) {
    const wCity = (item.warehouses?.city ?? '').toLowerCase();
    let score = 0;
    if (wCity === city) score += 10;
    else if (wCity.slice(0, 3) === city.slice(0, 3)) score += 5; // rough state match
    score += Math.floor(item.stock_quantity / 10);
    if (!best || score > best.score) best = { warehouse_id: item.warehouse_id, score };
  }

  return best?.warehouse_id ?? null;
}
