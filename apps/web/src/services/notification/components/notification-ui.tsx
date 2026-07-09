'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShallow } from 'zustand/react/shallow';
import { useNotificationStore, type Notification } from '../notification-store';

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS: Record<string, string> = {
  success: 'border-green-500/40 bg-green-500/10',
  error: 'border-red-500/40 bg-red-500/10',
  warning: 'border-yellow-500/40 bg-yellow-500/10',
  info: 'border-blue-500/40 bg-blue-500/10',
};

function ToastItem({ n, onDismiss }: { n: Notification; onDismiss: (id: string) => void }) {
  const Icon = ICONS[n.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3 py-2.5 shadow-lg backdrop-blur-md',
        COLORS[n.type],
      )}
    >
      <Icon size={16} className="text-foreground/70 mt-0.5 shrink-0" />
      <p className="text-foreground/80 min-w-0 text-xs leading-relaxed">{n.message}</p>
      {n.action && (
        <button
          onClick={n.action.handler}
          className="text-foreground/70 hover:text-foreground shrink-0 text-xs font-medium underline-offset-2 hover:underline"
        >
          {n.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(n.id)}
        className="text-foreground/30 hover:text-foreground/60 shrink-0"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useNotificationStore(useShallow((s) => s.queue.filter((n) => n.toast)));
  const dismiss = useNotificationStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed right-4 top-10 z-[9999] flex flex-col-reverse gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((n) => (
          <ToastItem key={n.id} n={n} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function NotificationList() {
  const notifications = useNotificationStore(useShallow((s) => s.queue.filter((n) => !n.toast)));
  const dismiss = useNotificationStore((s) => s.dismiss);

  if (notifications.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {notifications.map((n) => {
        const Icon = ICONS[n.type];
        return (
          <div
            key={n.id}
            className={cn('flex items-start gap-2.5 rounded-lg border px-3 py-2', COLORS[n.type])}
            role="alert"
            aria-live="polite"
          >
            <Icon size={14} className="text-foreground/70 mt-0.5 shrink-0" />
            <p className="text-foreground/80 min-w-0 text-xs">{n.message}</p>
            <button
              onClick={() => dismiss(n.id)}
              className="text-foreground/30 hover:text-foreground/60 ml-auto shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
