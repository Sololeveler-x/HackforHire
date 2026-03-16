import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useOrders = (statusFilter?: string) => {
  return useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: async () => {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (statusFilter) query = query.eq('order_status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useOrderItems = (orderId: string) => {
  return useQuery({
    queryKey: ['order_items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId);
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
};

// Re-export useProducts from useProducts.ts for backward compatibility
export { useProducts } from './useProducts';

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase.from('orders').update({ order_status: status }).eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
};

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderData: {
      customer_name: string;
      phone: string;
      address: string;
      city?: string;
      state?: string;
      pincode?: string;
      total_amount: number;
      payment_status?: string;
      payment_method?: string;
      total_paid?: number;
      upi_id?: string | null;
      agent_commission_amount?: number;
      shipping_provider?: string;
      shipping_charge?: number;
      inquiry_id?: string | null;
      // warehouse splits from fulfillment plan — used for stock reservation
      warehouseSplits?: { warehouse_id: string; product_id: string; quantity: number }[];
      items: { product_id?: string | null; product_name: string; quantity: number; unit_price: number; total_price: number }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const method = orderData.payment_method ?? 'Cash on Delivery';
      const derivedStatus = (() => {
        if (orderData.payment_status) return orderData.payment_status;
        if (method === 'UPI' || method === 'Bank Transfer') return 'paid';
        if (method === 'Cash on Delivery') return 'cod_pending';
        if (method === 'Cheque') return 'cheque_pending';
        return 'pending';
      })();
      const derivedPaid = orderData.total_paid ?? ((method === 'UPI' || method === 'Bank Transfer') ? orderData.total_amount : 0);

      const orderInsert: any = {
        customer_name: orderData.customer_name,
        phone: orderData.phone,
        address: orderData.address,
        total_amount: orderData.total_amount,
        payment_status: derivedStatus,
        payment_method: method,
        total_paid: derivedPaid,
        order_status: 'ready_for_packing',
        created_by: user?.id,
      };

      if (orderData.upi_id) orderInsert.upi_id = orderData.upi_id;
      if (orderData.agent_commission_amount) orderInsert.agent_commission_amount = orderData.agent_commission_amount;
      if (orderData.shipping_provider) orderInsert.shipping_provider = orderData.shipping_provider;
      if (orderData.shipping_charge) orderInsert.shipping_charge = orderData.shipping_charge;
      if (orderData.city) orderInsert.city = orderData.city;
      if (orderData.state) orderInsert.state = orderData.state;
      if (orderData.pincode) orderInsert.pincode = orderData.pincode;

      const { data: order, error } = await supabase.from('orders').insert(orderInsert).select().single();
      if (error) throw error;

      const items = orderData.items.map((item) => ({
        ...item,
        product_id: item.product_id ?? null as unknown as string,
        order_id: order.id,
      }));
      const { error: itemsError } = await (supabase as any).from('order_items').insert(items);
      if (itemsError) throw itemsError;

      // Create transaction
      await supabase.from('transactions').insert({
        order_id: order.id,
        amount: orderData.total_amount,
        payment_method: method,
      });

      // FIX 1: Reserve stock atomically at billing time using fulfillment plan splits
      if (orderData.warehouseSplits && orderData.warehouseSplits.length > 0) {
        for (const split of orderData.warehouseSplits) {
          if (!split.product_id || !split.warehouse_id) continue;
          const { data: reserved } = await (supabase as any).rpc('reserve_stock', {
            p_order_id: order.id,
            p_product_id: split.product_id,
            p_warehouse_id: split.warehouse_id,
            p_quantity: split.quantity,
          });
          if (!reserved) {
            // Rollback: cancel the order and release any partial reservations
            await (supabase as any).rpc('release_stock_reservation', { p_order_id: order.id });
            await supabase.from('orders').update({
              order_status: 'cancelled',
              notes: `Insufficient stock at billing time for product ${split.product_id}`,
            } as any).eq('id', order.id);
            throw new Error(`Stock unavailable. Another order may have taken the last units. Please try again.`);
          }
        }
        // Set primary warehouse from first split
        await supabase.from('orders').update({
          assigned_warehouse_id: orderData.warehouseSplits[0].warehouse_id,
        } as any).eq('id', order.id);
      }

      return order;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
};

export const useMarkAsPacked = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, warehouseId }: { orderId: string; warehouseId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('packing').upsert({
        order_id: orderId,
        packing_status: 'packed',
        packed_by: user?.id,
        packed_at: new Date().toISOString(),
      });

      // Resolve warehouse
      let resolvedWarehouseId = warehouseId;
      if (!resolvedWarehouseId) {
        const { data: order } = await supabase.from('orders').select('assigned_warehouse_id').eq('id', orderId).single();
        resolvedWarehouseId = (order as any)?.assigned_warehouse_id;
      }

      // FIX 1: Check if stock was already reserved at billing time.
      // If yes — mark reservation fulfilled (stock already deducted), skip deduct_warehouse_stock.
      // If no — fall back to old deduction path (backward compat for orders created before this fix).
      const { data: alreadyReserved } = await (supabase as any).rpc('has_stock_reservation', { p_order_id: orderId });

      if (alreadyReserved) {
        // Stock was reserved at billing — just mark fulfilled, no double deduction
        await (supabase as any).rpc('fulfill_stock_reservation', { p_order_id: orderId });
      } else if (resolvedWarehouseId) {
        // Legacy path: order created before reservation system — deduct now
        await supabase.rpc('deduct_warehouse_stock' as any, {
          p_warehouse_id: resolvedWarehouseId,
          p_order_id: orderId,
        });
      }

      if (resolvedWarehouseId) {
        await supabase.from('orders').update({ assigned_warehouse_id: resolvedWarehouseId } as any).eq('id', orderId);
      }
      await supabase.from('orders').update({ order_status: 'ready_for_shipping' }).eq('id', orderId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['warehouse_inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// Cancel order — release stock reservation (or restore if legacy order)
export const useCancelOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const { data: order } = await supabase.from('orders').select('assigned_warehouse_id').eq('id', orderId).single();
      const warehouseId = (order as any)?.assigned_warehouse_id;

      // FIX 1: Try release_stock_reservation first (new system)
      const { data: alreadyReserved } = await (supabase as any).rpc('has_stock_reservation', { p_order_id: orderId });
      if (alreadyReserved) {
        await (supabase as any).rpc('release_stock_reservation', { p_order_id: orderId });
      } else if (warehouseId) {
        // Legacy: restore via old RPC for orders created before reservation system
        await supabase.rpc('restore_warehouse_stock' as any, {
          p_warehouse_id: warehouseId,
          p_order_id: orderId,
        });
      }

      const { error } = await supabase.from('orders').update({
        order_status: 'cancelled',
        payment_status: 'cancelled',
      } as any).eq('id', orderId);
      if (error) throw error;
      return { orderId, reason };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['warehouse_inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// FIX 1: Payment transactions hooks
export const usePaymentTransactions = (orderId: string) => {
  return useQuery({
    queryKey: ['payment_transactions', orderId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('payment_transactions').select('*').eq('order_id', orderId).order('payment_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orderId,
  });
};

export const useRecordPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      order_id: string;
      amount: number;
      payment_method: string;
      notes?: string;
      transaction_ref?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('payment_transactions').insert({
        ...payload,
        recorded_by: user?.id,
      });
      if (error) throw error;
      // Recalculate total_paid
      const { data: txns } = await (supabase as any).from('payment_transactions').select('amount').eq('order_id', payload.order_id);
      const totalPaid = (txns ?? []).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const { data: order } = await supabase.from('orders').select('total_amount, payment_method').eq('id', payload.order_id).single() as any;
      const totalAmount = Number(order?.total_amount ?? 0);
      const method = ((order as any)?.payment_method ?? '').toLowerCase();
      const newStatus = totalPaid >= totalAmount
        ? 'paid'
        : method.includes('cash') || method === 'cod'
          ? 'cod_pending'
          : method === 'cheque'
            ? 'cheque_pending'
            : 'pending';
      await supabase.from('orders').update({ payment_status: newStatus } as any).eq('id', payload.order_id);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['payment_transactions', vars.order_id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useMarkAsShipped = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      provider,
      trackingId,
    }: {
      orderId: string;
      provider: string;
      trackingId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // FIX 2: Persist tracking URL — never regenerate from window.location later
      const trackingUrl = `${window.location.origin}/track/${trackingId}`;

      const { data: order } = await supabase
        .from('orders')
        .select('customer_name, phone')
        .eq('id', orderId)
        .single();

      // Save to shipping table
      await supabase.from('shipping').upsert({
        order_id: orderId,
        shipping_provider: provider,
        tracking_id: trackingId,
        tracking_url: trackingUrl,
        shipping_status: 'shipped',
        shipped_by: user?.id,
        shipped_at: new Date().toISOString(),
      });

      // FIX 2: Also save tracking_url on orders row for easy access
      await supabase.from('orders').update({
        order_status: 'shipped',
        tracking_url: trackingUrl,
      } as any).eq('id', orderId);

      return { order, trackingUrl, trackingId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useOrderStats = () => {
  return useQuery({
    queryKey: ['order_stats'],
    queryFn: async () => {
      const { data: orders } = await supabase.from('orders').select('*');
      if (!orders) return { total: 0, revenue: 0, pending: 0, packed: 0, shipped: 0 };
      return {
        total: orders.length,
        revenue: orders.reduce((sum, o) => sum + Number(o.total_amount), 0),
        pending: orders.filter((o) => o.order_status === 'ready_for_packing').length,
        packed: orders.filter((o) => o.order_status === 'ready_for_shipping').length,
        shipped: orders.filter((o) => o.order_status === 'shipped').length,
      };
    },
  });
};

// Fetch orders with tracking information for search
export const useOrdersWithTracking = (statusFilter?: string) => {
  return useQuery({
    queryKey: ['orders_with_tracking', statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from('orders')
        .select('*, order_items(product_id, product_name, quantity, unit_price, total_price)')
        .order('created_at', { ascending: false });
      
      if (statusFilter) query = query.eq('order_status', statusFilter);
      
      const { data: orders, error } = await query;
      if (error) throw error;
      
      if (!orders || orders.length === 0) return [];
      
      // Fetch shipping data separately
      const { data: shippingData } = await supabase
        .from('shipping')
        .select('order_id, tracking_id, shipping_provider')
        .in('order_id', orders.map((o: any) => o.id));
      
      // Merge: prefer shipping table provider (post-ship), fall back to orders.shipping_provider (set in billing)
      return orders.map((order: any) => {
        const shipping = shippingData?.find((s: any) => s.order_id === order.id);
        return {
          ...order,
          tracking_id: shipping?.tracking_id || null,
          shipping_provider: shipping?.shipping_provider || order.shipping_provider || null,
        };
      });
    },
  });
};
