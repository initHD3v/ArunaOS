'use client';

import { useEffect, useState, useRef, useMemo } from 'react';

import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-media-query';
import { useArunaEngine } from '@/features/engine/engine-context';
import type { SystemNotification } from '@arunaos/engine';
import { Bell, BellOff, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-l-red-500 bg-red-500/5',
  high: 'border-l-yellow-500 bg-yellow-500/5',
  normal: 'border-l-blue-500 bg-blue-500/5',
  low: 'border-l-foreground/20',
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-yellow-500',
  normal: 'bg-blue-500',
  low: 'bg-foreground/30',
};

interface GroupedNotifs {
  source: string;
  notifications: SystemNotification[];
}

export function NotificationCenterPopup({ onClose }: { onClose: () => void }) {
  const { engine, ready } = useArunaEngine();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!engine || !ready) return;
    const hub = engine.getNotificationHub();

    function refresh() {
      setNotifications(hub.getAll());
    }
    refresh();

    const unsub = hub.onNotification(() => refresh());
    return () => unsub();
  }, [engine, ready]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const grouped = useMemo(() => {
    const map = new Map<string, SystemNotification[]>();
    for (const n of notifications) {
      const list = map.get(n.source) ?? [];
      list.push(n);
      map.set(n.source, list);
    }
    const result: GroupedNotifs[] = [];
    for (const [source, list] of map) {
      result.push({ source, notifications: list });
    }
    return result.sort((a, b) => {
      const aMax = Math.max(...a.notifications.map((n) => n.timestamp));
      const bMax = Math.max(...b.notifications.map((n) => n.timestamp));
      return bMax - aMax;
    });
  }, [notifications]);

  const totalUnread = notifications.filter((n) => !n.read).length;

  function toggleGroup(source: string) {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  }

  function markAllRead() {
    if (!engine) return;
    engine.getNotificationHub().markAllRead();
    setNotifications(engine.getNotificationHub().getAll());
  }

  function clearNotifs() {
    if (!engine) return;
    engine.getNotificationHub().clear();
    setNotifications([]);
  }

  function formatTime(ts: number) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'baru saja';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}j`;
    return d.toLocaleDateString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }

  const header = (
    <div className="border-border/20 flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
      <Bell size={12} className="text-foreground/40" />
      <span className="text-foreground/70 text-[11px] font-medium">Notifikasi</span>
      {totalUnread > 0 && (
        <span className="bg-danger/70 ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-medium text-white">
          {totalUnread}
        </span>
      )}
      {isMobile && (
        <button
          onClick={onClose}
          className="text-foreground/30 hover:text-foreground/60 text-[10px]"
        >
          Tutup
        </button>
      )}
    </div>
  );

  const body = (
    <div className="max-h-80 overflow-y-auto">
      {notifications.length === 0 ? (
        <div className="text-foreground/20 flex flex-col items-center gap-2 py-8">
          <BellOff size={20} />
          <p className="text-[10px]">Tidak ada notifikasi</p>
        </div>
      ) : (
        <div className="divide-border/10 divide-y">
          {grouped.map((g) => {
            const expanded = expandedSources.has(g.source);
            const unreadCount = g.notifications.filter((n) => !n.read).length;
            return (
              <div key={g.source}>
                <button
                  onClick={() => toggleGroup(g.source)}
                  className="hover:bg-muted/30 flex w-full items-center gap-1.5 px-3 py-2 text-left transition-colors"
                >
                  {expanded ? (
                    <ChevronDown size={10} className="text-foreground/30" />
                  ) : (
                    <ChevronRight size={10} className="text-foreground/30" />
                  )}
                  <span className="text-foreground/60 flex-1 text-[10px] font-medium">
                    {g.source}
                  </span>
                  {unreadCount > 0 && (
                    <span className="bg-primary/20 text-primary flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[7px] font-medium">
                      {unreadCount}
                    </span>
                  )}
                  <span className="text-foreground/20 text-[9px]">{g.notifications.length}</span>
                </button>

                {expanded && (
                  <div className="space-y-1 px-2 pb-2">
                    {g.notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'flex items-start gap-2 rounded-lg border-l-2 px-2 py-1.5 transition-colors',
                          PRIORITY_COLORS[n.priority] ?? 'border-l-transparent',
                          !n.read ? 'bg-muted/40' : '',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                            PRIORITY_DOT[n.priority],
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="text-foreground/70 truncate text-[10px] font-medium">
                              {n.title}
                            </p>
                            <span className="text-foreground/20 ml-auto shrink-0 text-[7px]">
                              {formatTime(n.timestamp)}
                            </span>
                          </div>
                          <p className="text-foreground/40 truncate text-[9px]">{n.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const footer = notifications.length > 0 && (
    <div className="border-border/20 flex shrink-0 items-center gap-1 border-t px-3 py-2">
      <button
        onClick={markAllRead}
        className="text-foreground/30 hover:text-foreground/60 hover:bg-muted flex items-center gap-1 rounded-md px-2 py-1 text-[9px] transition-colors"
      >
        <Trash2 size={8} />
        Tandai dibaca
      </button>
      <button
        onClick={clearNotifs}
        className="text-foreground/30 hover:text-danger/60 hover:bg-danger/10 ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-[9px] transition-colors"
      >
        <BellOff size={8} />
        Kosongkan
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[9999]">
        <div className="bg-background/95 flex h-full flex-col backdrop-blur-2xl">
          <div
            className="flex shrink-0 items-center justify-between border-b px-4 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-foreground/40" />
              <span className="text-foreground/70 text-xs font-medium">Notifikasi</span>
              {totalUnread > 0 && (
                <span className="bg-danger/70 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-medium text-white">
                  {totalUnread}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-foreground/30 hover:text-foreground/60 text-xs"
            >
              Tutup
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto max-w-lg">
              {notifications.length === 0 ? (
                <div className="text-foreground/20 flex flex-col items-center gap-2 py-16">
                  <BellOff size={24} />
                  <p className="text-xs">Tidak ada notifikasi</p>
                </div>
              ) : (
                <div className="divide-border/10 divide-y">
                  {grouped.map((g) => {
                    const expanded = expandedSources.has(g.source);
                    const unreadCount = g.notifications.filter((n) => !n.read).length;
                    return (
                      <div key={g.source}>
                        <button
                          onClick={() => toggleGroup(g.source)}
                          className="hover:bg-muted/30 flex w-full items-center gap-2 px-4 py-3 text-left transition-colors"
                        >
                          {expanded ? (
                            <ChevronDown size={12} className="text-foreground/30" />
                          ) : (
                            <ChevronRight size={12} className="text-foreground/30" />
                          )}
                          <span className="text-foreground/60 flex-1 text-xs font-medium">
                            {g.source}
                          </span>
                          {unreadCount > 0 && (
                            <span className="bg-primary/20 text-primary flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-[8px] font-medium">
                              {unreadCount}
                            </span>
                          )}
                          <span className="text-foreground/20 text-[10px]">
                            {g.notifications.length}
                          </span>
                        </button>
                        {expanded && (
                          <div className="space-y-1 px-4 pb-3">
                            {g.notifications.map((n) => (
                              <div
                                key={n.id}
                                className={cn(
                                  'flex items-start gap-2 rounded-lg border-l-2 px-3 py-2 transition-colors',
                                  PRIORITY_COLORS[n.priority] ?? 'border-l-transparent',
                                  !n.read ? 'bg-muted/40' : '',
                                )}
                              >
                                <span
                                  className={cn(
                                    'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                                    PRIORITY_DOT[n.priority],
                                  )}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1">
                                    <p className="text-foreground/70 truncate text-xs font-medium">
                                      {n.title}
                                    </p>
                                    <span className="text-foreground/20 ml-auto shrink-0 text-[8px]">
                                      {formatTime(n.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-foreground/40 truncate text-[10px]">
                                    {n.body}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {notifications.length > 0 && (
            <div
              className="flex shrink-0 items-center gap-2 border-t px-4 py-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={markAllRead}
                className="text-foreground/30 hover:text-foreground/60 hover:bg-muted flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors"
              >
                <Trash2 size={12} />
                Tandai dibaca
              </button>
              <button
                onClick={clearNotifs}
                className="text-foreground/30 hover:text-danger/60 hover:bg-danger/10 ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors"
              >
                <BellOff size={12} />
                Kosongkan
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="border-border/30 bg-card/95 w-80 overflow-hidden rounded-xl border shadow-xl shadow-black/10 backdrop-blur-2xl"
    >
      {header}
      {body}
      {footer}
    </div>
  );
}
