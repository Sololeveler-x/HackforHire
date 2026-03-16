import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EmployeeRole = 'billing' | 'packing' | 'shipping' | 'sales_agent';

export interface Employee {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  department_notes: string | null;
  status: string;
  profile_completed: boolean;
  created_at: string;
  role: EmployeeRole | 'admin' | null;
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  city: string;
  department_notes: string;
  password: string;
}

export interface UpdateEmployeeInput {
  user_id: string;
  name: string;
  phone: string;
  city: string;
  department_notes: string;
  status: string;
  role: EmployeeRole | 'admin';
}

function generatePassword(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `SGB@${digits}`;
}

export { generatePassword };

// Fetch all employees (profiles joined with user_roles)
export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async (): Promise<Employee[]> => {
      // Try full query first, fall back to base columns if migration not run
      let profiles: any[] = [];
      const { data: fullData, error: fullError } = await (supabase as any)
        .from('profiles')
        .select('user_id, name, email, phone, city, department_notes, status, profile_completed, created_at')
        .order('created_at', { ascending: false });

      if (fullError) {
        // Migration not run yet — fall back to base columns only
        const { data: baseData, error: baseError } = await (supabase as any)
          .from('profiles')
          .select('user_id, name, email, created_at')
          .order('created_at', { ascending: false });
        if (baseError) throw baseError;
        profiles = (baseData ?? []).map((p: any) => ({ ...p, phone: null, city: null, department_notes: null, status: 'active', profile_completed: false }));
      } else {
        profiles = fullData ?? [];
      }

      // Fetch roles for all users
      const { data: roles } = await (supabase as any)
        .from('user_roles')
        .select('user_id, role');

      const roleMap: Record<string, string> = {};
      (roles ?? []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

      return (profiles ?? []).map((p: any) => ({
        ...p,
        status: p.status ?? 'active',
        profile_completed: p.profile_completed ?? false,
        role: roleMap[p.user_id] ?? null,
      }));
    },
  });
}

// Create employee via edge function
export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEmployeeInput) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-employee`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(input),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create employee');
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

// Update employee profile
export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, role, ...rest }: UpdateEmployeeInput) => {
      // Update profile
      const { error: profileErr } = await (supabase as any)
        .from('profiles')
        .update(rest)
        .eq('user_id', user_id);
      if (profileErr) throw profileErr;

      // Update role: delete old, insert new
      await (supabase as any).from('user_roles').delete().eq('user_id', user_id);
      await (supabase as any).from('user_roles').insert({ user_id, role });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

// Reset password via edge function (reuse create-employee pattern but just update password)
export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ user_id, password }: { user_id: string; password: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-employee-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ user_id, password }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to reset password');
      return json;
    },
  });
}

// Deactivate employee
export function useDeactivateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) => {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('user_id', user_id);
      if (error) throw error;

      // Unassign leads
      await (supabase as any)
        .from('inquiries')
        .update({ assigned_to: null })
        .eq('assigned_to', user_id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

// Delete employee (profile only — auth user stays, admin can delete from Supabase dashboard)
export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) => {
      await (supabase as any).from('user_roles').delete().eq('user_id', user_id);
      const { error } = await (supabase as any).from('profiles').delete().eq('user_id', user_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

// Complete own profile (for sales agents first login)
export function useCompleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, phone, city }: { user_id: string; phone: string; city: string }) => {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ phone, city, profile_completed: true })
        .eq('user_id', user_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['own-profile'] }),
  });
}

// Fetch own profile
export function useOwnProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['own-profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('user_id, name, phone, city, profile_completed')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data as { user_id: string; name: string; phone: string | null; city: string | null; profile_completed: boolean };
    },
  });
}
