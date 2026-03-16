import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('product_name');
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productData: {
      product_name: string;
      description: string;
      category: string;
      price: number;
      low_stock_threshold: number;
      image_url: string;
    }) => {
      // stock is NOT set here — it auto-syncs from warehouse_inventory via trigger
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['low_stock_products'] });
    },
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productData: {
      id: string;
      product_name: string;
      description: string;
      category: string;
      price: number;
      low_stock_threshold: number;
      image_url: string;
    }) => {
      const { id, ...updateData } = productData;
      // stock is NOT updated here — it auto-syncs from warehouse_inventory via trigger
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['low_stock_products'] });
    },
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['low_stock_products'] });
    },
  });
};
