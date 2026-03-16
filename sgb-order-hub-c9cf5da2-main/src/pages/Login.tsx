import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const roleToRoute = (role: string) => {
  if (role === 'sales_agent') return '/sales-agent';
  return `/${role}`;
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleHint = searchParams.get('role') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);

      // Retry fetching role up to 10 times (5 seconds total)
      let userRole: string | null = null;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 500));
          const { data } = await supabase.rpc('get_user_role', { _user_id: user.id });
          if (data) { userRole = data; break; }
        }
      }

      toast.success('Logged in successfully!');
      navigate(userRole ? roleToRoute(userRole) : '/');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = roleHint ? roleHint.charAt(0).toUpperCase() + roleHint.slice(1).replace('-', ' ') : '';

  return (
    <div className="relative min-h-screen bg-[#060d1a] overflow-hidden flex items-center justify-center px-4">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(22,163,74,0.12) 0%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center text-white font-bold text-base">S</div>
          <div>
            <p className="text-sm font-bold text-white">SGB Agro Industries</p>
            <p className="text-[10px] text-slate-500">Internal System</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl backdrop-blur-md p-8">
          <h1 className="text-white font-bold text-xl mb-1">
            {roleLabel ? `${roleLabel} Login` : 'Sign In'}
          </h1>
          <p className="text-slate-500 text-xs mb-6">
            {roleLabel ? `Access the ${roleLabel} dashboard` : 'Enter your credentials to continue'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-white/10 border border-white/15 text-white rounded-xl px-3 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/10 border border-white/15 text-white rounded-xl px-3 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs text-slate-600">
          <a href="/" className="text-slate-400 hover:text-white transition-colors">← Back to Home</a>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
