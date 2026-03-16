import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlowingStatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
  color?: 'green' | 'blue' | 'amber' | 'purple' | 'red';
  className?: string;
}

const colorMap = {
  green: {
    glow: 'shadow-green-500/20',
    border: 'border-green-500/30',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    trendColor: 'text-green-400',
    gradient: 'from-green-500/10 via-transparent to-transparent',
  },
  blue: {
    glow: 'shadow-blue-500/20',
    border: 'border-blue-500/30',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    trendColor: 'text-blue-400',
    gradient: 'from-blue-500/10 via-transparent to-transparent',
  },
  amber: {
    glow: 'shadow-amber-500/20',
    border: 'border-amber-500/30',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    trendColor: 'text-amber-400',
    gradient: 'from-amber-500/10 via-transparent to-transparent',
  },
  purple: {
    glow: 'shadow-purple-500/20',
    border: 'border-purple-500/30',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    trendColor: 'text-purple-400',
    gradient: 'from-purple-500/10 via-transparent to-transparent',
  },
  red: {
    glow: 'shadow-red-500/20',
    border: 'border-red-500/30',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    trendColor: 'text-red-400',
    gradient: 'from-red-500/10 via-transparent to-transparent',
  },
};

export function GlowingStatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp = true,
  color = 'green',
  className,
}: GlowingStatCardProps) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card p-5 shadow-lg',
        c.border,
        c.glow,
        className
      )}
    >
      {/* Gradient overlay */}
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', c.gradient)} />

      <div className="relative flex items-start justify-between">
        <div className={cn('rounded-lg p-2.5', c.iconBg)}>
          <Icon className={cn('h-5 w-5', c.iconColor)} />
        </div>
        {trend && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trendUp ? 'text-green-400' : 'text-red-400')}>
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend}
          </div>
        )}
      </div>

      <div className="relative mt-3">
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </motion.div>
  );
}
