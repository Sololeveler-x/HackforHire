import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const db = supabase as any;

export interface Return {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  requested_by: string | null;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  requester_name?: string;
  customer_name?: string;
  order_amount?: number;
}

export const RETURN_REASONS = [
  'Customer refused delivery',
  'Wrong product delivered',
  'Damaged product',
  'Customer changed mind',
  'Other',
] as const;

export function useReturns(statusFilter?: string) {
  return useQuery({
    queryKey: ['returns', statusFilter],
    queryFn: async () => {
      let q = db
        .from('returns')
        .select('*, orders(customer_name, total_amount), profiles(name)')
        .order('created_at', { ascending: false });
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        customer_name: r.orders?.customer_name ?? '—',
        order_amount: r.orders?.total_amount ?? 0,
        requester_name: r.profiles?.name ?? '—',
      })) as Return[];
    },
  });
}

export function useRequestReturn() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ order_id, reason, notes }: { order_id: string; reason: string; notes: string }) => {
      const { error } = await db.from('returns').insert({
        order_id,
        reason,
        notes,
        requested_by: user?.id,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['returns'] }),
  });
}

export function useUpdateReturnStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status, notes, order_id, warehouse_id }: {
      id: string; status: string; notes?: string; order_id?: string; warehouse_id?: string;
    }) => {
      const { error } = await db
        .from('returns')
        .update({ status, notes, approved_by: user?.id })
        .eq('id', id);
      if (error) throw error;

      // If approved, add stock back to warehouse
      if (status === 'approved' && order_id && warehouse_id) {
        const { data: items } = await db
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', order_id);
        for (const item of items ?? []) {
          const { data: inv } = await db
            .from('warehouse_inventory')
            .select('stock_quantity')
            .eq('warehouse_id', warehouse_id)
            .eq('product_id', item.product_id)
            .single();
          if (inv) {
            await db.from('warehouse_inventory')
              .update({ stock_quantity: inv.stock_quantity + item.quantity })
              .eq('warehouse_id', warehouse_id)
              .eq('product_id', item.product_id);
          }
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['returns'] }),
  });
}
