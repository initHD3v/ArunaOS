'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { useService } from '@/providers/service-provider';
import type { ModuleWindowService } from '@/services/module-window';
import { getAppIdForModule } from '@/services/module-window';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { useDockStore, ICON_MAP } from '@/features/dock/stores/dock.store';
import type { DockItem } from '@/features/dock/stores/dock.store';

export function Dock() {
  const windows = useWindowStore((s) => s.windows);
  const focusedWindowId = useWindowStore((s) => s.focusedWindowId);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const restoreWindow = useWindowStore((s) => s.restoreWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const openWindow = useWindowStore((s) => s.openWindow);

  const dockItems = useDockStore(useShallow((s) => s.items.filter((i) => !i.hidden)));
  const settings = useDockStore((s) => s.settings);
  const reorderItems = useDockStore((s) => s.reorderItems);
  const removeFromDock = useDockStore((s) => s.removeFromDock);

  const [openMenuApp, setOpenMenuApp] = useState<string | null>(null);
  const [contextItem, setContextItem] = useState<DockItem | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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

  useEffect(() => {
    if (!contextItem) return;
    const close = () => setContextItem(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [contextItem]);

  const moduleWindowService = useService<ModuleWindowService>('moduleWindow');

  const handleClick = useCallback(
    async (appId: string) => {
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

      // Try module service first — handles full module IDs like 'arunaos.settings'
      try {
        await moduleWindowService.openModule(appId);
        return;
      } catch {
        /* not a registered module, fall through */
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const id = `dock-${appId}-${Date.now()}`;

      const defaults: Record<
        string,
        { title: string; icon: string; size: { width: number; height: number } }
      > = {
        applications: { title: 'Applications', icon: 'grid', size: { width: 800, height: 560 } },
        files: { title: 'Files', icon: 'folder', size: { width: 960, height: 640 } },
        settings: { title: 'Settings', icon: 'settings', size: { width: 720, height: 520 } },
        camera: { title: 'Camera', icon: 'camera', size: { width: 800, height: 600 } },
        astat: { title: 'Activity Monitor', icon: 'activity', size: { width: 800, height: 500 } },
        ai: { title: 'AI', icon: 'sparkles', size: { width: 640, height: 480 } },
        appstore: { title: 'AppStore', icon: 'grid', size: { width: 900, height: 640 } },
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
    [windows, focusWindow, restoreWindow, openWindow, moduleWindowService],
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

  const handleContextMenu = useCallback((e: React.MouseEvent, item: DockItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextItem(item);
  }, []);

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((idx: number) => {
    setDragOverIdx(idx);
  }, []);

  const addToDock = useDockStore((s) => s.addToDock);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIdx: number) => {
      e.preventDefault();
      // Try external module drop
      const raw = e.dataTransfer.getData('application/arunaos-module');
      if (raw) {
        try {
          const mod = JSON.parse(raw);
          if (mod.id && mod.name) {
            addToDock({
              id: mod.id,
              appId: mod.appId || getAppIdForModule(mod.id),
              label: mod.name,
              iconName: mod.icon || 'grid',
              hidden: false,
            });
          }
        } catch {
          /* ignore */
        }
        setDragIdx(null);
        setDragOverIdx(null);
        return;
      }
      // Internal reorder
      if (dragIdx !== null && dragIdx !== toIdx) {
        reorderItems(dragIdx, toIdx);
      }
      setDragIdx(null);
      setDragOverIdx(null);
    },
    [dragIdx, reorderItems, addToDock],
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  const positionClasses = {
    bottom: 'fixed bottom-4 left-1/2 -translate-x-1/2 flex-row',
    left: 'fixed left-4 top-1/2 -translate-y-1/2 flex-col',
    right: 'fixed right-4 top-1/2 -translate-y-1/2 flex-col',
  };

  return (
    <>
      <div
        ref={dockRef}
        className={cn(
          'border-border/30 bg-background/20 z-50 flex items-center gap-1 rounded-2xl border px-3 py-2 shadow-lg shadow-black/5 backdrop-blur-2xl transition-all duration-200',
          positionClasses[settings.position],
          settings.autoHide ? 'opacity-0 hover:opacity-100' : 'opacity-100',
        )}
      >
        {dockItems.map((item, idx) => {
          const Icon = ICON_MAP[item.iconName];
          if (!Icon) return null;
          const winEntries = Object.entries(windows).filter(([_, w]) => w.appId === item.appId);
          const activeCount = winEntries.filter(([_, w]) => w.state !== 'minimized').length;
          const minimizedCount = winEntries.filter(([_, w]) => w.state === 'minimized').length;
          const totalCount = winEntries.length;
          const isMenuOpen = openMenuApp === item.appId;

          return (
            <div key={item.id} className="relative flex flex-col items-center">
              <motion.button
                whileHover={settings.magnification ? { scale: 1.25, y: -4 } : { scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => handleClick(item.appId)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  handleDragOver(idx);
                }}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-colors duration-150 hover:bg-white/10 dark:hover:bg-white/10',
                  dragIdx === idx && 'opacity-50',
                  dragOverIdx === idx && dragIdx !== idx && 'scale-110',
                )}
                aria-label={item.label}
              >
                <Icon
                  size={settings.iconSize}
                  className="text-foreground/80 drop-shadow-sm"
                  strokeWidth={1.5}
                />
                <span className="text-foreground/60 text-[10px] font-medium">{item.label}</span>
                <div className="flex h-1.5 items-center gap-1">
                  {activeCount > 0 && <span className="bg-foreground/60 h-1 w-1 rounded-full" />}
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

      {/* Right-click context menu */}
      <AnimatePresence>
        {contextItem && (
          <motion.div
            ref={contextRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card/95 border-border/30 fixed z-[9999] min-w-40 rounded-xl border p-1.5 shadow-xl shadow-black/10 backdrop-blur-2xl"
            style={{
              left:
                settings.position === 'left'
                  ? 80
                  : settings.position === 'right'
                    ? undefined
                    : '50%',
              top: settings.position === 'bottom' ? undefined : '50%',
              bottom: settings.position === 'bottom' ? 80 : undefined,
              right: settings.position === 'right' ? 80 : undefined,
              transform: settings.position === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)',
            }}
          >
            <button
              onClick={() => {
                removeFromDock(contextItem.id);
                setContextItem(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
            >
              ✕ Remove from Dock
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
