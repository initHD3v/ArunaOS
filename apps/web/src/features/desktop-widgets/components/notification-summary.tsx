'use client';

import { useEffect, useState } from 'react';
import { Bell, Inbox, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useArunaEngine } from '@/features/engine/engine-context';
import type { SystemNotification } from '@arunaos/engine';

export function NotificationSummary() {
  const { engine, ready } = useArunaEngine();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => {
    if (!engine || !ready) return;
    const hub = engine.getNotificationHub();

    function refresh() {
      setNotifications([...hub.getAll()]);
    }
    refresh();

    const unsub = hub.onNotification(() => refresh());
    return () => unsub();
  }, [engine, ready]);

  const unread = notifications.filter((n) => !n.read).length;

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Inbox size={11} className="text-primary/60" />
          <span className="text-foreground/40 text-[10px] uppercase tracking-wider">
            Notifikasi
          </span>
        </div>
        <p className="text-foreground/20 text-[10px]">Tidak ada notifikasi</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Inbox size={11} className="text-primary/60" />
        <span className="text-foreground/40 text-[10px] uppercase tracking-wider">Notifikasi</span>
        {unread > 0 && (
          <span className="bg-danger/70 ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-medium text-white">
            {unread}
          </span>
        )}
      </div>
      <div className="max-h-32 space-y-1 overflow-y-auto">
        {notifications.slice(0, 5).map((n) => (
          <div
            key={n.id}
            className={cn(
              'flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors',
              !n.read ? 'bg-primary/5' : 'hover:bg-card/80',
            )}
          >
            <Bell size={10} className="text-foreground/30 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground/70 truncate text-[10px] font-medium">{n.title}</p>
              <p className="text-foreground/30 truncate text-[9px]">{n.body}</p>
            </div>
            <span
              className={cn(
                'mt-0.5 rounded-full px-1 text-[7px]',
                n.priority === 'urgent'
                  ? 'text-danger bg-danger/10'
                  : n.priority === 'high'
                    ? 'text-warning bg-warning/10'
                    : 'text-foreground/20 bg-card/80',
              )}
            >
              {n.priority}
            </span>
          </div>
        ))}
      </div>
      {unread > 0 && (
        <button
          onClick={() => {
            engine?.getNotificationHub().markAllRead();
            setNotifications(engine?.getNotificationHub().getAll() ?? []);
          }}
          className="text-foreground/20 hover:text-foreground/50 flex items-center gap-1 text-[9px] transition-colors"
        >
          <Trash2 size={8} />
          Tandai sudah dibaca
        </button>
      )}
    </div>
  );
}
