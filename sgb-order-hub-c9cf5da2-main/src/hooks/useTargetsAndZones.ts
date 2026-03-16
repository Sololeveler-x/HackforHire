import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface TerritoryZone {
  id: string;
  zone_name: string;
  cities: string[];
  assigned_agent_id: string | null;
  created_at: string;
  agent_name?: string;
}

export interface AgentTarget {
  id: string;
  agent_id: string;
  month: number;
  year: number;
  target_amount: number;
  target_orders: number;
  created_at: string;
  agent_name?: string;
  achieved_amount?: number;
  achieved_orders?: number;
}

// ── Territory Zones ──────────────────────────────────────────────────────────
export function useTerritoryZones() {
  return useQuery({
    queryKey: ['territory_zones'],
    queryFn: async () => {
      const { data, error } = await db
        .from('territory_zones')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((z: any) => ({
        ...z,
        agent_name: z.profiles?.name ?? '—',
      })) as TerritoryZone[];
    },
  });
}

export function useUpsertTerritoryZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; zone_name: string; cities: string[]; assigned_agent_id: string | null }) => {
      if (input.id) {
        const { error } = await db.from('territory_zones').update(input).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await db.from('territory_zones').insert(input);
        if (error) throw error;
      }
      // Update agent's territory_zone field
      if (input.assigned_agent_id) {
        await db.from('profiles').update({ territory_zone: input.zone_name }).eq('user_id', input.assigned_agent_id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['territory_zones'] }),
  });
}

export function useDeleteTerritoryZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('territory_zones').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['territory_zones'] }),
  });
}

// ── Agent Targets ────────────────────────────────────────────────────────────
export function useAgentTargets(month: number, year: number) {
  return useQuery({
    queryKey: ['agent_targets', month, year],
    queryFn: async () => {
      // Get all sales agents
      const { data: agents } = await db
        .from('profiles')
        .select('user_id, name')
        .in('user_id', (await db.from('user_roles').select('user_id').eq('role', 'sales_agent')).data?.map((r: any) => r.user_id) ?? []);

      // Get targets for this month/year
      const { data: targets } = await db
        .from('agent_targets')
        .select('*')
        .eq('month', month)
        .eq('year', year);

      // Get achieved amounts from inquiries
      const { data: inquiries } = await db
        .from('inquiries')
        .select('assigned_to, agreed_price, status')
        .eq('status', 'pending_billing');

      const targetMap: Record<string, AgentTarget> = {};
      (targets ?? []).forEach((t: any) => { targetMap[t.agent_id] = t; });

      const achievedMap: Record<string, { amount: number; orders: number }> = {};
      (inquiries ?? []).forEach((i: any) => {
        if (!achievedMap[i.assigned_to]) achievedMap[i.assigned_to] = { amount: 0, orders: 0 };
        achievedMap[i.assigned_to].amount += Number(i.agreed_price ?? 0);
        achievedMap[i.assigned_to].orders += 1;
      });

      return (agents ?? []).map((a: any) => ({
        agent_id: a.user_id,
        agent_name: a.name,
        id: targetMap[a.user_id]?.id ?? '',
        month,
        year,
        target_amount: targetMap[a.user_id]?.target_amount ?? 0,
        target_orders: targetMap[a.user_id]?.target_orders ?? 0,
        achieved_amount: achievedMap[a.user_id]?.amount ?? 0,
        achieved_orders: achievedMap[a.user_id]?.orders ?? 0,
        created_at: targetMap[a.user_id]?.created_at ?? '',
      })) as AgentTarget[];
    },
  });
}

export function useUpsertAgentTargets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targets: { agent_id: string; month: number; year: number; target_amount: number; target_orders: number }[]) => {
      const { error } = await db
        .from('agent_targets')
        .upsert(targets, { onConflict: 'agent_id,month,year' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent_targets'] }),
  });
}

// Own target for sales agent dashboard
export function useOwnTarget(agentId: string | undefined) {
  const now = new Date();
  return useQuery({
    queryKey: ['own_target', agentId, now.getMonth() + 1, now.getFullYear()],
    enabled: !!agentId,
    queryFn: async () => {
      const { data } = await db
        .from('agent_targets')
        .select('*')
        .eq('agent_id', agentId)
        .eq('month', now.getMonth() + 1)
        .eq('year', now.getFullYear())
        .single();
      return data as AgentTarget | null;
    },
  });
}
