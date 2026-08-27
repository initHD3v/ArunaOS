'use client';

import { useEffect, useState, useMemo } from 'react';
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

  const grouped = useMemo(() => {
    const map = new Map<string, SystemNotification[]>();
    for (const n of notifications) {
      const list = map.get(n.source) ?? [];
      list.push(n);
      map.set(n.source, list);
    }
    const result: { source: string; latest: SystemNotification; count: number }[] = [];
    for (const [source, list] of map) {
      list.sort((a, b) => b.timestamp - a.timestamp);
      const latest = list[0];
      if (latest) result.push({ source, latest, count: list.length });
    }
    return result.sort((a, b) => b.latest.timestamp - a.latest.timestamp).slice(0, 3);
  }, [notifications]);

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Inbox size={11} className="text-primary/60" />
          <span className="text-foreground/40 text-[10px] uppercase tracking-wider">
            Notifikasi
          </span>
        </div>
        <p className="text-foreground/40 text-[10px]">Tidak ada notifikasi</p>
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
        {grouped.map((g) => {
          const n = g.latest;
          const unreadGroup = !n.read;
          return (
            <div
              key={g.source}
              className={cn(
                'flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors',
                unreadGroup ? 'bg-primary/5' : 'hover:bg-card/80',
              )}
            >
              <Bell size={10} className="text-foreground/50 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-foreground/70 truncate text-[10px] font-medium">{n.title}</p>
                  {g.count > 1 && (
                    <span className="text-foreground/40 shrink-0 text-[7px]">+{g.count - 1}</span>
                  )}
                </div>
                <p className="text-foreground/50 truncate text-[9px]">{n.body}</p>
              </div>
              <span
                className={cn(
                  'mt-0.5 rounded-full px-1 text-[7px]',
                  n.priority === 'urgent'
                    ? 'text-danger bg-danger/10'
                    : n.priority === 'high'
                      ? 'text-warning bg-warning/10'
                      : 'text-foreground/40 bg-card/80',
                )}
              >
                {g.source}
              </span>
            </div>
          );
        })}
      </div>
      {unread > 0 && (
        <button
          onClick={() => {
            engine?.getNotificationHub().markAllRead();
            setNotifications(engine?.getNotificationHub().getAll() ?? []);
          }}
          className="text-foreground/40 hover:text-foreground/50 flex items-center gap-1 text-[9px] transition-colors"
        >
          <Trash2 size={8} />
          Tandai sudah dibaca
        </button>
      )}
    </div>
  );
}
