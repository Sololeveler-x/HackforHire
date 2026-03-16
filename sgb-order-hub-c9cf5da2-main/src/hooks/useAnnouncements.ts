import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const db = supabase as any;

export interface Announcement {
  id: string;
  title: string;
  message: string;
  target_roles: string[];
  is_urgent: boolean;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export function useAnnouncements(role?: string) {
  const qc = useQueryClient();

  // Realtime — any change to announcements table refetches all announcement queries
  useEffect(() => {
    const channel = db
      .channel('announcements-banner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        qc.invalidateQueries({ queryKey: ['announcements'] });
      })
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [qc]);

  return useQuery({
    queryKey: ['announcements', role],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await db
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      return ((data ?? []) as Announcement[]).filter(a => {
        if (a.expires_at && new Date(a.expires_at) < now) return false;
        if (!role) return true;
        return a.target_roles.includes('all') || a.target_roles.includes(role);
      });
    },
  });
}

export function useAllAnnouncements() {
  return useQuery({
    queryKey: ['announcements', 'admin'],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await db
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Announcement, 'id' | 'created_at' | 'created_by'>) => {
      const { error } = await db.from('announcements').insert({ ...input, created_by: null });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<Announcement> & { id: string }) => {
      const { error } = await db.from('announcements').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useDeactivateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('announcements').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}
