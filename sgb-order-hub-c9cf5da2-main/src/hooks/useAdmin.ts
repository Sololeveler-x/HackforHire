import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;

      return profiles.map(profile => ({
        ...profile,
        role: roles.find(r => r.user_id === profile.user_id)?.role || 'billing',
      }));
    },
  });
};

export const useProductStats = () => {
  return useQuery({
    queryKey: ['product_stats'],
    queryFn: async () => {
      const { data: items } = await supabase
        .from('order_items')
        .select('product_name, quantity, total_price');
      
      if (!items) return [];

      const productMap = new Map<string, { quantity: number; revenue: number }>();
      
      items.forEach(item => {
        const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
        productMap.set(item.product_name, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + Number(item.total_price),
        });
      });

      return Array.from(productMap.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    },
  });
};

export const useShippingStats = () => {
  return useQuery({
    queryKey: ['shipping_stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('shipping')
        .select('shipping_provider')
        .eq('shipping_status', 'shipped');
      
      if (!data) return [];

      const providerMap = new Map<string, number>();
      data.forEach(item => {
        if (item.shipping_provider) {
          providerMap.set(
            item.shipping_provider,
            (providerMap.get(item.shipping_provider) || 0) + 1
          );
        }
      });

      return Array.from(providerMap.entries()).map(([name, value]) => ({ name, value }));
    },
  });
};

export const useMonthlyRevenue = () => {
  return useQuery({
    queryKey: ['monthly_revenue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .order('created_at', { ascending: true });
      
      if (!data) return [];

      const monthMap = new Map<string, number>();
      data.forEach(order => {
        const month = new Date(order.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
        monthMap.set(month, (monthMap.get(month) || 0) + Number(order.total_amount));
      });

      return Array.from(monthMap.entries())
        .map(([month, revenue]) => ({ month, revenue }))
        .slice(-6);
    },
  });
};

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: {
      product_name: string;
      category: string;
      price: number;
      description?: string;
      stock: number;
    }) => {
      const { error } = await supabase.from('products').insert(product);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};
