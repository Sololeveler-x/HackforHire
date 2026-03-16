import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Lead {
  id: string;
  customer_name: string;
  phone_number: string;
  product_name: string | null;
  products_json: any | null;
  quantity: number | null;
  delivery_city: string | null;
  source: string | null;
  status: string;
  call_status: string | null;
  assigned_to: string | null;
  agreed_price: number | null;
  created_at: string;
}

export interface AgentWorkload {
  user_id: string;
  name: string;
  city: string | null;
  active_leads: number;
  submitted_today: number;
  revenue_today: number;
}

// All leads for admin (new, assigned, pending_billing)
export function useAdminLeads() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-leads'],
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await (supabase as any)
        .from('inquiries')
        .select('id, customer_name, phone_number, product_name, products_json, quantity, delivery_city, source, status, call_status, assigned_to, agreed_price, created_at')
        .in('status', ['new', 'assigned', 'pending_billing'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = (supabase as any)
      .channel('admin-leads-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inquiries' }, (payload: any) => {
        const lead = payload.new as Lead;
        toast.info(`New lead from ${lead.delivery_city ?? 'unknown'}: ${lead.customer_name} wants ${lead.product_name ?? 'product'}`);
        qc.invalidateQueries({ queryKey: ['admin-leads'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inquiries' }, () => {
        qc.invalidateQueries({ queryKey: ['admin-leads'] });
      })
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [qc]);

  return query;
}

// Agent workload data
export function useAgentWorkloads() {
  return useQuery({
    queryKey: ['agent-workloads'],
    queryFn: async (): Promise<AgentWorkload[]> => {
      // Get all sales agents
      const { data: roles } = await (supabase as any)
        .from('user_roles')
        .select('user_id')
        .eq('role', 'sales_agent');

      if (!roles || roles.length === 0) return [];

      const agentIds = roles.map((r: any) => r.user_id);

      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('user_id, name, city')
        .in('user_id', agentIds)
        .eq('status', 'active');

      const { data: leads } = await (supabase as any)
        .from('inquiries')
        .select('assigned_to, status, agreed_price, created_at')
        .in('assigned_to', agentIds);

      const today = new Date().toDateString();

      return (profiles ?? []).map((p: any) => {
        const agentLeads = (leads ?? []).filter((l: any) => l.assigned_to === p.user_id);
        const active = agentLeads.filter((l: any) => l.status === 'assigned').length;
        const submittedToday = agentLeads.filter((l: any) =>
          l.status === 'pending_billing' && new Date(l.created_at).toDateString() === today
        ).length;
        const revenueToday = agentLeads
          .filter((l: any) => l.status === 'pending_billing' && new Date(l.created_at).toDateString() === today)
          .reduce((sum: number, l: any) => sum + (l.agreed_price ?? 0), 0);

        return { user_id: p.user_id, name: p.name, city: p.city, active_leads: active, submitted_today: submittedToday, revenue_today: revenueToday };
      });
    },
  });
}

// Bulk assign leads
export function useBulkAssignLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignments: { lead_id: string; agent_id: string }[]) => {
      for (const { lead_id, agent_id } of assignments) {
        const { error } = await (supabase as any)
          .from('inquiries')
          .update({ assigned_to: agent_id, status: 'assigned' })
          .eq('id', lead_id);
        if (error) throw new Error(`Failed to assign lead: ${error.message}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-leads'] });
      qc.invalidateQueries({ queryKey: ['agent-workloads'] });
    },
  });
}

// Mark as spam (delete)
export function useMarkSpam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await (supabase as any).from('inquiries').delete().in('id', ids);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-leads'] }),
  });
}

// Performance data
export interface AgentPerformance {
  user_id: string;
  name: string;
  city: string | null;
  leads_assigned: number;
  called: number;
  submitted: number;
  revenue: number;
  conversion_rate: number;
}

export function useAgentPerformance(period: 'today' | 'week' | 'month') {
  return useQuery({
    queryKey: ['agent-performance', period],
    queryFn: async (): Promise<AgentPerformance[]> => {
      const now = new Date();
      let since: Date;
      if (period === 'today') {
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'week') {
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        since = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const { data: roles } = await (supabase as any)
        .from('user_roles').select('user_id').eq('role', 'sales_agent');
      if (!roles || roles.length === 0) return [];

      const agentIds = roles.map((r: any) => r.user_id);
      const { data: profiles } = await (supabase as any)
        .from('profiles').select('user_id, name, city').in('user_id', agentIds);

      const { data: leads } = await (supabase as any)
        .from('inquiries')
        .select('assigned_to, status, call_status, agreed_price, created_at')
        .in('assigned_to', agentIds)
        .gte('created_at', since.toISOString());

      return (profiles ?? []).map((p: any) => {
        const al = (leads ?? []).filter((l: any) => l.assigned_to === p.user_id);
        const assigned = al.length;
        const called = al.filter((l: any) => l.call_status === 'called' || l.call_status === 'submitted').length;
        const submitted = al.filter((l: any) => l.status === 'pending_billing').length;
        const revenue = al.filter((l: any) => l.status === 'pending_billing').reduce((s: number, l: any) => s + (l.agreed_price ?? 0), 0);
        return {
          user_id: p.user_id, name: p.name, city: p.city,
          leads_assigned: assigned, called, submitted, revenue,
          conversion_rate: assigned > 0 ? Math.round((submitted / assigned) * 100) : 0,
        };
      }).sort((a: AgentPerformance, b: AgentPerformance) => b.revenue - a.revenue);
    },
  });
}
