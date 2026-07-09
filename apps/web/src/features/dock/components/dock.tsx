'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Monitor, Sparkles, FolderOpen, Settings, Activity, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/features/window-manager/stores/window.store';

const dockItems = [
  { id: 'finder', icon: Monitor, label: 'Finder', appId: 'finder' },
  { id: 'ai', icon: Sparkles, label: 'AI', appId: 'ai' },
  { id: 'files', icon: FolderOpen, label: 'Files', appId: 'files' },
  { id: 'camera', icon: Camera, label: 'Camera', appId: 'camera' },
  { id: 'astat', icon: Activity, label: 'AStat', appId: 'astat' },
  { id: 'settings', icon: Settings, label: 'Settings', appId: 'settings' },
] as const;

export function Dock() {
  const windows = useWindowStore((s) => s.windows);
  const focusedWindowId = useWindowStore((s) => s.focusedWindowId);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const restoreWindow = useWindowStore((s) => s.restoreWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const openWindow = useWindowStore((s) => s.openWindow);

  const [openMenuApp, setOpenMenuApp] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuApp) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuApp(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuApp(null);
    };
    document.addEventListener('mousedown', handleClick, true);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick, true);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [openMenuApp]);

  const handleClick = useCallback(
    (appId: string) => {
      const entries = Object.entries(windows).filter(([_, w]) => w.appId === appId);
      if (entries.length > 1) {
        setOpenMenuApp((prev) => (prev === appId ? null : appId));
        return;
      }

      if (entries.length === 1) {
        const entry = entries[0]!;
        const eid = entry[0];
        const w = entry[1];
        if (w.state === 'minimized') {
          restoreWindow(eid);
        } else {
          focusWindow(eid);
        }
        return;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const id = `dock-${appId}-${Date.now()}`;

      const defaults: Record<
        string,
        { title: string; icon: string; size: { width: number; height: number } }
      > = {
        files: { title: 'Files', icon: 'folder', size: { width: 960, height: 640 } },
        settings: { title: 'Settings', icon: 'settings', size: { width: 720, height: 520 } },
        camera: { title: 'Camera', icon: 'camera', size: { width: 800, height: 600 } },
        astat: { title: 'Activity Monitor', icon: 'activity', size: { width: 800, height: 500 } },
        ai: { title: 'AI', icon: 'sparkles', size: { width: 640, height: 480 } },
        finder: { title: 'Finder', icon: 'folder', size: { width: 960, height: 640 } },
      };

      const cfg = defaults[appId] ?? {
        title: appId,
        icon: 'file',
        size: { width: 640, height: 480 },
      };

      openWindow({
        id,
        title: cfg.title,
        icon: cfg.icon,
        appId: appId === 'finder' ? 'files' : appId,
        position: {
          x: Math.max(40, (vw - cfg.size.width) / 2 + (Math.random() - 0.5) * 80),
          y: Math.max(40, (vh - cfg.size.height) / 2 + (Math.random() - 0.5) * 40),
        },
        size: cfg.size,
        zIndex: 1,
        state: 'active',
      });
    },
    [windows, focusWindow, restoreWindow, openWindow],
  );

  const handleMenuSelect = useCallback(
    (id: string, state: string) => {
      if (state === 'minimized') {
        restoreWindow(id);
      } else {
        focusWindow(id);
      }
      setOpenMenuApp(null);
    },
    [focusWindow, restoreWindow],
  );

  const handleKill = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      closeWindow(id);
      const remaining = Object.entries(useWindowStore.getState().windows);
      if (remaining.length === 0) setOpenMenuApp(null);
    },
    [closeWindow],
  );

  return (
    <div
      ref={dockRef}
      className={cn(
        'fixed bottom-4 left-1/2 z-50 -translate-x-1/2',
        'flex items-end gap-1',
        'px-3 py-2',
        'rounded-2xl',
        'bg-background/20 backdrop-blur-2xl',
        'border-border/30 border',
        'shadow-lg shadow-black/5',
      )}
    >
      {dockItems.map((item) => {
        const winEntries = Object.entries(windows).filter(([_, w]) => w.appId === item.appId);
        const activeCount = winEntries.filter(([_, w]) => w.state !== 'minimized').length;
        const minimizedCount = winEntries.filter(([_, w]) => w.state === 'minimized').length;
        const totalCount = winEntries.length;
        const isMenuOpen = openMenuApp === item.appId;

        return (
          <div key={item.id} className="relative flex flex-col items-center">
            <motion.button
              whileHover={{ scale: 1.15, y: -4 }}
              whileTap={{ scale: 0.95 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              onClick={() => handleClick(item.appId)}
              className={cn(
                'flex flex-col items-center gap-1',
                'px-3 py-1.5',
                'rounded-xl',
                'hover:bg-white/10 dark:hover:bg-white/10',
                'transition-colors duration-150',
                'cursor-default',
                'relative',
              )}
              aria-label={item.label}
            >
              <item.icon
                size={22}
                className="text-foreground/80 drop-shadow-sm"
                strokeWidth={1.5}
              />
              <span className="text-foreground/60 text-[10px] font-medium">{item.label}</span>
              <div className="flex h-1.5 items-center gap-1">
                {activeCount > 0 && (
                  <span
                    className={cn(
                      'bg-foreground/60 rounded-full transition-all',
                      activeCount === 1 ? 'h-1 w-1' : 'h-1 w-1',
                    )}
                  />
                )}
              </div>
              {minimizedCount > 0 && (
                <span className="absolute -top-0.5 right-0.5 h-2 w-2 rounded-full bg-yellow-400 shadow-sm" />
              )}
              {totalCount > 1 && (
                <span className="bg-primary/80 text-primary-foreground absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none">
                  {totalCount}
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="bg-card/95 border-border/30 absolute bottom-full mb-2 min-w-56 rounded-2xl border p-2 shadow-xl shadow-black/10 backdrop-blur-2xl"
                >
                  <div className="text-foreground/40 px-1 pb-1.5 text-[10px] font-medium">
                    {totalCount} Window{totalCount > 1 ? 's' : ''}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {winEntries.map(([id, w]) => (
                      <div
                        key={id}
                        onClick={() => handleMenuSelect(id, w.state)}
                        className="group/window hover:bg-muted flex cursor-default items-center gap-3 rounded-xl px-2.5 py-2 transition-colors"
                      >
                        <div
                          className={cn(
                            'h-12 w-16 shrink-0 overflow-hidden rounded-lg border',
                            w.state === 'minimized' ? 'opacity-50 saturate-0' : '',
                            focusedWindowId === id ? 'border-border/60' : 'border-border/20',
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-3 items-center gap-0.5 px-1.5',
                              w.state === 'minimized' ? 'bg-muted' : 'bg-background',
                            )}
                          >
                            <span className="h-1 w-1 rounded-full bg-red-500" />
                            <span className="h-1 w-1 rounded-full bg-yellow-500" />
                            <span className="h-1 w-1 rounded-full bg-green-500" />
                          </div>
                          <div className="from-muted/30 to-muted/5 h-full bg-gradient-to-b" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-foreground truncate text-sm font-medium">
                            {w.title}
                          </div>
                          <div className="text-foreground/40 text-[10px]">
                            {w.state === 'minimized' ? 'Hidden' : 'Active'}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleKill(e, id)}
                          className="text-foreground/30 flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover/window:opacity-100"
                          aria-label={`Close ${w.title}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
