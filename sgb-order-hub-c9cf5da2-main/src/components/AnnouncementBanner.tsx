import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnnouncements } from '@/hooks/useAnnouncements';

interface Props { role?: string; }

export function AnnouncementBanner({ role }: Props) {
  const { data: announcements = [] } = useAnnouncements(role);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('dismissed_announcements');
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });

  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    localStorage.setItem('dismissed_announcements', JSON.stringify([...next]));
  };

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {visible.map(a => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium overflow-hidden ${
              a.is_urgent
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}
          >
            <span className="text-sm flex-shrink-0">{a.is_urgent ? '🚨' : '📢'}</span>
            <span className="font-semibold flex-shrink-0">{a.title}:</span>
            <span className="opacity-80 flex-1 truncate">{a.message}</span>
            <button
              onClick={() => dismiss(a.id)}
              className="ml-auto opacity-50 hover:opacity-100 text-lg leading-none transition-opacity flex-shrink-0"
              aria-label="Dismiss"
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
