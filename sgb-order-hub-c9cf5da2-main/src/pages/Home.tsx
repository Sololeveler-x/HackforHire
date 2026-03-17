import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{ scale: [1, 1.1, 1], x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-60 -left-40 w-[700px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(22,163,74,0.18) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], x: [0, -50, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute top-0 right-0 w-[600px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.10) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], y: [0, 50, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 8 }}
        className="absolute bottom-0 left-1/3 w-[500px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(13,148,136,0.10) 0%, transparent 70%)' }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  );
}

function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    c.width = window.innerWidth; c.height = window.innerHeight;
    const pts = Array.from({ length: 50 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
      r: Math.random() * 1.2 + .4, o: Math.random() * .35 + .1,
    }));
    let id: number;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > c.width) p.vx *= -1;
        if (p.y < 0 || p.y > c.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(22,163,74,${p.o})`; ctx.fill();
      });
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(id);
  }, []);
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" />;
}

function PortalCard({ icon, title, description, color, colorBg, onClick, delay }: {
  icon: string; title: string; description: string;
  color: string; colorBg: string; onClick: () => void; delay: number;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      onMouseMove={e => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseEnter={() => setGlow(true)}
      onMouseLeave={() => setGlow(false)}
      className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-5 cursor-pointer overflow-hidden backdrop-blur-sm group"
    >
      {glow && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
          style={{
            background: `radial-gradient(200px circle at ${pos.x}px ${pos.y}px, ${color}20, transparent 70%)`,
            border: `1px solid ${color}35`,
          }}
        />
      )}
      <div className="relative z-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
          style={{ background: colorBg }}
        >
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
        <p className="text-[11px] text-slate-500 leading-relaxed">{description}</p>
      </div>
      <motion.div
        className="absolute bottom-3 right-3 text-slate-600 group-hover:text-slate-400 transition-colors"
        animate={glow ? { x: 2, y: -2 } : { x: 0, y: 0 }}
      >
        →
      </motion.div>
    </motion.div>
  );
}

function WhatsAppSandboxSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="mt-12 flex justify-center text-left"
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5 space-y-3 w-full max-w-xs">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <div>
            <p className="text-sm font-semibold text-white">Demo — Scan to join WhatsApp sandbox</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Send{' '}
              <code className="bg-white/10 text-green-400 px-1.5 py-0.5 rounded text-[10px] font-mono">
                join nearest-tall
              </code>{' '}
              to{' '}
              <span className="text-slate-300 font-medium">+1 415 523 8886</span>
            </p>
          </div>
        </div>
        <div className="flex justify-center">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent('https://wa.me/14155238886?text=join%20nearest-tall')}&bgcolor=060d1a&color=22c55e&qzone=1`}
            alt="Scan to join WhatsApp sandbox"
            className="rounded-xl border border-white/10"
            width={140}
            height={140}
          />
        </div>
        <p className="text-[10px] text-slate-600 text-center">
          Scan with your phone camera to open WhatsApp
        </p>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const navigate = useNavigate();

  const portals = [
    { icon: '🛡️', title: 'Admin Portal', description: 'Full system control, analytics, team management', color: '#7c3aed', colorBg: 'rgba(124,58,237,0.15)', path: '/login?role=admin' },
    { icon: '📋', title: 'Billing Portal', description: 'Create orders, manage invoices and payments', color: '#2563eb', colorBg: 'rgba(37,99,235,0.15)', path: '/login?role=billing' },
    { icon: '📦', title: 'Packing Portal', description: 'Warehouse packing, AI fulfillment planner', color: '#d97706', colorBg: 'rgba(217,119,6,0.15)', path: '/login?role=packing' },
    { icon: '🚚', title: 'Shipping Portal', description: 'Dispatch orders, track deliveries, collect payments', color: '#0d9488', colorBg: 'rgba(13,148,136,0.15)', path: '/login?role=shipping' },
    { icon: '📞', title: 'Sales Agent', description: 'Manage leads, negotiate and close orders', color: '#16a34a', colorBg: 'rgba(22,163,74,0.15)', path: '/login?role=sales-agent' },
  ];

  return (
    <div className="relative min-h-screen bg-[#060d1a] overflow-hidden">
      <AuroraBackground />
      <Particles />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <img src="/sgb-logo.png" alt="SGB Logo" className="h-8 w-auto object-contain" />
          <span className="text-sm font-semibold text-white">SGB Agro Industries</span>
          <span className="text-[10px] text-slate-500 hidden sm:block">Internal System</span>
        </div>
        <a
          href="/customer"
          className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20"
        >
          Track Order
        </a>
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[11px] font-medium px-4 py-1.5 rounded-full mb-6"
        >
          🏆 Elevate 2024 Winner — Karnataka State
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex flex-col items-center mb-4"
        >
          <div className="flex items-center gap-4 mb-2">
            <img src="/sgb-logo.png" alt="SGB Agro Logo" className="h-16 w-auto object-contain drop-shadow-lg" />
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight text-left">
              SGB Agro Industries
            </h1>
          </div>
          <span className="text-4xl sm:text-5xl font-bold text-green-400">Order Hub</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-slate-400 text-sm mb-10 max-w-lg mx-auto"
        >
          Smart Machines. Simple Farming. Stronger Farmers.
          <span className="block mt-1 text-slate-500 text-xs">Koppa, Karnataka · Est. 16 March 2020</span>
        </motion.p>

        {/* Portal cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {portals.map((p, i) => (
            <PortalCard
              key={p.title}
              icon={p.icon}
              title={p.title}
              description={p.description}
              color={p.color}
              colorBg={p.colorBg}
              delay={0.15 + i * 0.07}
              onClick={() => navigate(p.path)}
            />
          ))}
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-white/[0.06]"
        >
          {[
            { val: '6', label: 'Products' },
            { val: 'AI', label: 'Fulfillment' },
            { val: '2', label: 'Logistics partners' },
            { val: '100%', label: 'WhatsApp automated' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-bold text-green-400">{s.val}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <p className="text-slate-600 text-xs mt-8">
          Customer?{' '}
          <a href="/customer" className="text-green-500 hover:text-green-400 underline underline-offset-2">
            Track your order here →
          </a>
        </p>

        {/* WhatsApp Sandbox Section */}
        <WhatsAppSandboxSection />
      </div>
    </div>
  );
}
