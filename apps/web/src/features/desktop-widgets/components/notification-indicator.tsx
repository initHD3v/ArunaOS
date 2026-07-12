'use client';

import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-media-query';
import { useArunaEngine } from '@/features/engine/engine-context';
import type { SystemNotification } from '@arunaos/engine';
import { NotificationCenterPopup } from './notification-center';

const DOT_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-yellow-500',
  normal: 'bg-blue-500',
  low: 'bg-foreground/30',
};

export function NotificationIndicator() {
  const { engine, ready } = useArunaEngine();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState<SystemNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!engine || !ready) return;
    const hub = engine.getNotificationHub();

    function refresh() {
      setUnread(hub.getUnread());
    }
    refresh();

    const unsub = hub.onNotification(() => refresh());
    return () => unsub();
  }, [engine, ready]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const isMobile = useIsMobile();
  const hasUnread = unread.length > 0;
  const showDots = unread.slice(0, 4);
  const extra = unread.length - showDots.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'flex items-center gap-0.5 rounded-md transition-colors',
          isMobile ? 'h-8 w-8 justify-center' : 'h-6 px-1.5 py-0.5',
          open
            ? 'bg-muted text-foreground'
            : 'text-foreground/60 hover:text-foreground hover:bg-muted/50',
        )}
        title="Notifikasi"
      >
        {hasUnread ? (
          <>
            {showDots.map((n) => (
              <span
                key={n.id}
                className={cn(
                  'h-1.5 w-1.5 rounded-full shadow-sm',
                  DOT_COLORS[n.priority] ?? 'bg-foreground/30',
                )}
              />
            ))}
            {extra > 0 && (
              <span className="text-foreground/40 ml-0.5 text-[8px] font-medium">+{extra}</span>
            )}
          </>
        ) : (
          <span className="bg-foreground/20 h-1.5 w-1.5 rounded-full" />
        )}
      </button>

      {isMobile ? (
        open && <NotificationCenterPopup onClose={() => setOpen(false)} />
      ) : (
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full z-[9999] mt-1"
            >
              <NotificationCenterPopup onClose={() => setOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
