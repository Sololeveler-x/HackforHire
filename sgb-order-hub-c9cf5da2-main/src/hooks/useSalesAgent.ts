import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AgentLead {
  id: string;
  customer_name: string;
  phone_number: string;
  product_name: string | null;
  products_json: any | null; // array of {product_name, quantity}
  quantity: number | null;
  delivery_city: string | null;
  delivery_address: string | null;
  raw_message: string | null;
  source: string | null;
  status: string;
  call_status: string | null;
  assigned_to: string | null;
  agreed_price: number | null;
  discount: number | null;
  payment_method: string | null;
  notes: string | null;
  call_notes: string | null;
  callback_date: string | null;
  not_interested_reason: string | null;
  shipping_provider: string | null;
  created_at: string;
}

export const NOT_INTERESTED_REASONS = [
  'Will call back later',
  'Interested but needs time',
  'Will buy on specific date',
  'Price too high — needs discount',
  'Wrong product — wants something else',
  'Not reachable — try again',
  'Genuinely not interested',
] as const;

export type NotInterestedReason = typeof NOT_INTERESTED_REASONS[number];

const CALLBACK_REASONS: NotInterestedReason[] = [
  'Will call back later',
  'Interested but needs time',
  'Will buy on specific date',
];

const FOLLOW_UP_REASONS: NotInterestedReason[] = [
  'Price too high — needs discount',
  'Wrong product — wants something else',
];

export function isCallbackReason(r: string) { return CALLBACK_REASONS.includes(r as any); }
export function isFollowUpReason(r: string) { return FOLLOW_UP_REASONS.includes(r as any); }

const db = supabase as any;

export function useAgentLeads() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['agent_leads', user?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from('inquiries')
        .select('*')
        .eq('assigned_to', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AgentLead[];
    },
    enabled: !!user?.id,
  });
}

export function useAgentStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['agent_stats', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      // Leads assigned today
      const { data: todayData, error: e1 } = await db
        .from('inquiries')
        .select('id')
        .eq('assigned_to', user?.id)
        .gte('created_at', today);
      if (e1) throw e1;

      // All leads for this agent (for calls made + revenue)
      const { data: allData, error: e2 } = await db
        .from('inquiries')
        .select('call_status, status, agreed_price')
        .eq('assigned_to', user?.id);
      if (e2) throw e2;

      const all = (allData ?? []) as AgentLead[];
      // Any lead that was actually spoken to (not just sitting as not_called)
      const calledStatuses = ['called', 'callback_scheduled', 'needs_follow_up', 'not_interested', 'submitted'];
      return {
        leadsToday: (todayData ?? []).length,
        callsMade: all.filter(l => calledStatuses.includes(l.call_status ?? '')).length,
        ordersSubmitted: all.filter(l => l.status === 'pending_billing' || l.call_status === 'submitted').length,
        totalValue: all
          .filter(l => (l.status === 'pending_billing' || l.call_status === 'submitted') && l.agreed_price)
          .reduce((sum, l) => sum + (l.agreed_price ?? 0), 0),
      };
    },
    enabled: !!user?.id,
  });
}

export function useUpdateCallStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, call_status }: { id: string; call_status: string }) => {
      const { error } = await db
        .from('inquiries')
        .update({ call_status })
        .eq('id', id)
        .eq('assigned_to', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent_leads'] });
      qc.invalidateQueries({ queryKey: ['agent_stats'] });
    },
  });
}

export function useMarkNotInterested() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
      call_notes,
      callback_date,
    }: {
      id: string;
      reason: string;
      call_notes: string;
      callback_date?: string | null;
    }) => {
      let call_status: string;
      if (isCallbackReason(reason)) {
        call_status = 'callback_scheduled';
      } else if (isFollowUpReason(reason)) {
        call_status = 'needs_follow_up';
      } else {
        call_status = 'not_interested';
      }

      const { error } = await db
        .from('inquiries')
        .update({
          call_status,
          not_interested_reason: reason,
          call_notes: call_notes || null,
          callback_date: callback_date || null,
        })
        .eq('id', id)
        .eq('assigned_to', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent_leads'] });
      qc.invalidateQueries({ queryKey: ['agent_stats'] });
    },
  });
}

export function useRescheduleCallback() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, callback_date }: { id: string; callback_date: string }) => {
      const { error } = await db
        .from('inquiries')
        .update({ callback_date, call_status: 'callback_scheduled' })
        .eq('id', id)
        .eq('assigned_to', user?.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent_leads'] }),
  });
}

export function useSubmitConfirmedOrder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (orderData: {
      id: string;
      customer_name: string;
      phone_number: string;
      product_name: string;
      products_json: any[];
      quantity: number;
      agreed_price: number;
      discount: number;
      delivery_city: string;
      delivery_address: string;
      payment_method: string;
      payment_status: string;
      upi_id?: string | null;
      notes: string;
      shipping_provider?: string;
    }) => {
      const { id, ...rest } = orderData;
      const { error } = await db
        .from('inquiries')
        .update({
          ...rest,
          status: 'pending_billing',
          source: 'agent_confirmed',
          call_status: 'submitted',
        })
        .eq('id', id)
        .eq('assigned_to', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent_leads'] });
      qc.invalidateQueries({ queryKey: ['agent_stats'] });
    },
  });
}


