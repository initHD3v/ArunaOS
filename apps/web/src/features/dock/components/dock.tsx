'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { useService } from '@/providers/service-provider';
import type { ModuleWindowService } from '@/services/module-window';
import { getAppIdForModule } from '@/services/module-window';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { createWindowConfig } from '@/lib/window-utils';
import { useDockStore, ICON_MAP } from '@/features/dock/stores/dock.store';
import type { DockItem } from '@/features/dock/stores/dock.store';
import { useIsMobile } from '@/hooks/use-media-query';
import { Search, Sparkles } from 'lucide-react';

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
  const [contextItem, setContextItem] = useState<{ item: DockItem; x: number; y: number } | null>(
    null,
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [showSearchMenu, setShowSearchMenu] = useState(false);
  const searchMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!showSearchMenu) return;
    const h = (e: MouseEvent | TouchEvent) => {
      if (searchMenuRef.current && !searchMenuRef.current.contains(e.target as Node))
        setShowSearchMenu(false);
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h as EventListener);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('touchstart', h as EventListener);
    };
  }, [showSearchMenu]);

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
        ai: { title: 'AI', icon: 'sparkles', size: { width: 800, height: 560 } },
        appstore: { title: 'AppStore', icon: 'grid', size: { width: 900, height: 640 } },
      };

      const cfg = defaults[appId] ?? {
        title: appId,
        icon: 'file',
        size: { width: 640, height: 480 },
      };

      // Always clamp to viewport — same behaviour on all devices
      const {
        width: winWidth,
        height: winHeight,
        x: winX,
        y: winY,
      } = createWindowConfig(cfg.size.width, cfg.size.height);

      openWindow({
        id,
        title: cfg.title,
        icon: cfg.icon,
        appId: appId === 'finder' ? 'files' : appId,
        position: { x: winX, y: winY },
        size: { width: winWidth, height: winHeight },
        zIndex: 1,
        state: 'active',
      });
    },
    [windows, focusWindow, restoreWindow, openWindow, moduleWindowService],
  );

  const openSpotlight = useCallback(() => {
    const btn = document.querySelector<HTMLButtonElement>('[data-command-palette-trigger]');
    if (btn) btn.click();
    else
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      );
  }, []);

  const openAICommand = useCallback(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'i',
        code: 'KeyI',
        metaKey: true,
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, []);

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
    setContextItem({ item, x: e.clientX, y: e.clientY });
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

  const iconSize = isMobile ? Math.max(settings.iconSize, 26) : settings.iconSize;

  const positionClasses = {
    bottom: cn(
      'fixed left-1/2 -translate-x-1/2 flex-row',
      isMobile ? 'bottom-2 px-2 py-2 gap-0.5' : 'bottom-4 px-3 py-2 gap-1',
    ),
    left: 'fixed left-4 top-1/2 -translate-y-1/2 flex-col',
    right: 'fixed right-4 top-1/2 -translate-y-1/2 flex-col',
  };

  return (
    <>
      <div
        ref={dockRef}
        className={cn(
          'border-border/30 bg-background/20 z-50 flex items-center rounded-2xl border shadow-lg shadow-black/5 backdrop-blur-2xl transition-all duration-200',
          positionClasses[settings.position],
          settings.autoHide && !isMobile ? 'opacity-0 hover:opacity-100' : 'opacity-100',
          isMobile && 'scrollbar-none max-w-[95vw] overflow-x-auto',
        )}
        style={{ WebkitOverflowScrolling: 'touch' }}
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
                whileHover={
                  !isMobile && settings.magnification
                    ? { scale: 1.25, y: -4 }
                    : { scale: 1.1, y: -3 }
                }
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
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  if (!t) return;
                  const el = e.currentTarget as HTMLElement;
                  el.dataset.startX = String(t.clientX);
                  el.dataset.startY = String(t.clientY);
                  const timer = window.setTimeout(() => {
                    handleContextMenu(
                      {
                        clientX: t.clientX,
                        clientY: t.clientY,
                        preventDefault: () => {},
                        stopPropagation: () => {},
                      } as unknown as React.MouseEvent,
                      item,
                    );
                  }, 550);
                  el.dataset.longPressTimer = String(timer);
                  handleDragStart(idx);
                }}
                onTouchMove={(e) => {
                  const t = e.touches[0];
                  if (!t) return;
                  const el = e.currentTarget as HTMLElement;
                  const sx = Number(el.dataset.startX || 0);
                  const sy = Number(el.dataset.startY || 0);
                  if (Math.hypot(t.clientX - sx, t.clientY - sy) > 10) {
                    const timer = Number(el.dataset.longPressTimer || 0);
                    if (timer) window.clearTimeout(timer);
                    const rect = dockRef.current?.getBoundingClientRect();
                    if (rect) {
                      const x = t.clientX - rect.left;
                      const approxIdx = Math.floor(x / 60);
                      if (approxIdx >= 0 && approxIdx < dockItems.length) handleDragOver(approxIdx);
                    }
                  }
                }}
                onTouchEnd={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  const timer = Number(el.dataset.longPressTimer || 0);
                  if (timer) window.clearTimeout(timer);
                  const t = e.changedTouches[0];
                  if (!t) {
                    handleDragEnd();
                    return;
                  }
                  const sx = Number(el.dataset.startX || 0);
                  const sy = Number(el.dataset.startY || 0);
                  if (Math.hypot(t.clientX - sx, t.clientY - sy) < 10) {
                    handleDragEnd();
                    return;
                  }
                  const rect = dockRef.current?.getBoundingClientRect();
                  if (rect) {
                    const x = t.clientX - rect.left;
                    const approxIdx = Math.floor(x / 60);
                    if (
                      approxIdx >= 0 &&
                      approxIdx < dockItems.length &&
                      dragIdx !== null &&
                      dragIdx !== approxIdx
                    ) {
                      reorderItems(dragIdx, Math.max(0, Math.min(dockItems.length - 1, approxIdx)));
                    }
                  }
                  handleDragEnd();
                }}
                className={cn(
                  'flex flex-col items-center rounded-xl transition-colors duration-150 hover:bg-white/10 dark:hover:bg-white/10',
                  isMobile ? 'gap-0.5 px-2 py-1.5' : 'gap-1 px-3 py-1.5',
                  dragIdx === idx && 'opacity-50',
                  dragOverIdx === idx && dragIdx !== idx && 'scale-110',
                )}
                aria-label={item.label}
              >
                <Icon
                  size={iconSize}
                  className="text-foreground/80 drop-shadow-sm"
                  strokeWidth={1.5}
                />
                {!isMobile && (
                  <span className="text-foreground/60 text-[10px] font-medium">{item.label}</span>
                )}
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
                            className="text-foreground/50 flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover/window:opacity-100"
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
        {isMobile && (
          <div ref={searchMenuRef} className="relative flex items-center gap-1">
            <div className="mx-1 h-6 w-px bg-white/10" />
            <button
              onClick={() => setShowSearchMenu((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black shadow"
              aria-label="Search"
            >
              <Search size={14} />
            </button>
            {showSearchMenu && (
              <div className="absolute bottom-full left-1/2 z-50 mb-2 flex -translate-x-1/2 flex-col gap-1 rounded-2xl border border-white/10 bg-black/80 p-1.5 shadow-xl backdrop-blur-xl">
                <button
                  onClick={() => {
                    setShowSearchMenu(false);
                    openSpotlight();
                  }}
                  className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-black"
                >
                  <Search size={12} /> Spotlight
                </button>
                <button
                  onClick={() => {
                    setShowSearchMenu(false);
                    openAICommand();
                  }}
                  className="flex items-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-xs font-medium text-white"
                >
                  <Sparkles size={12} /> AI Command
                </button>
              </div>
            )}
          </div>
        )}
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
              left: contextItem.x,
              top: contextItem.y,
            }}
          >
            <button
              onClick={() => {
                removeFromDock(contextItem.item.id);
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
