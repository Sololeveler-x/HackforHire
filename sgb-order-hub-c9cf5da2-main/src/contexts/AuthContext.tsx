import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'billing' | 'packing' | 'shipping' | 'sales_agent';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  roleLoading: boolean;
  signUp: (email: string, password: string, name: string, role: AppRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);

  const fetchRole = async (userId: string) => {
    setRoleLoading(true);
    // Retry up to 8 times with 500ms delay (handles propagation delay after insert)
    for (let i = 0; i < 8; i++) {
      const { data } = await supabase.rpc('get_user_role', { _user_id: userId });
      if (data) {
        setRole(data as AppRole);
        setRoleLoading(false);
        return;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    setRole(null);
    setRoleLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // FIX 8: Handle sign out event explicitly
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setRole(null);
        setRoleLoading(false);
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchRole(session.user.id), 0);
      } else {
        setRole(null);
        setRoleLoading(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      }
      setLoading(false);
    });

    // FIX 8: Re-check session when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            setSession(null);
            setUser(null);
            setRole(null);
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signUp = async (email: string, password: string, name: string, roleValue: AppRole) => {
    // Step 1: Sign up the user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { name },
        emailRedirectTo: window.location.origin 
      },
    });
    
    if (error) throw error;
    
    if (data.user) {
      // Step 2: Create profile (trigger should handle this, but we'll do it manually as backup)
      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: data.user.id,
        name: name,
        email: email,
      }, { onConflict: 'user_id' });
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't throw - profile might be created by trigger
      }
      
      // Step 3: Create user role (insert, ignore if already exists)
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role: roleValue,
      });
      
      if (roleError) {
        console.error('Role creation error:', roleError);
        throw new Error('Failed to assign role. Please contact administrator.');
      }
      
      setRole(roleValue);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, roleLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
