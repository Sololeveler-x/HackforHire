import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LowStockItem {
  product_name: string;
  warehouse_name: string;
  stock_quantity: number;
  reorder_level: number;
}

export const useLowStockProducts = () => {
  return useQuery({
    queryKey: ['low_stock_products'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('warehouse_inventory')
        .select(`
          stock_quantity,
          reorder_level,
          products ( product_name ),
          warehouses ( warehouse_name )
        `);

      if (error) throw error;

      return (data ?? [])
        .filter((row: any) => row.stock_quantity <= row.reorder_level)
        .map((row: any) => ({
          product_name: row.products?.product_name ?? 'Unknown',
          warehouse_name: row.warehouses?.warehouse_name ?? 'Unknown',
          stock_quantity: row.stock_quantity,
          reorder_level: row.reorder_level,
        })) as LowStockItem[];
    },
  });
};

export const useInventory = () => {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, product_name, category, stock, price, image_url')
        .order('stock', { ascending: true });
      
      if (error) throw error;
      
      return data?.map(product => ({
        ...product,
        stock_quantity: (product as any).stock ?? 0,
        low_stock_threshold: 10,
      }));
    },
  });
};
