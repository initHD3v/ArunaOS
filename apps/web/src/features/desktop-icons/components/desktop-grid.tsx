'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import { DesktopIcon } from '@/features/desktop-icons/components/desktop-icon';
import { useDesktopStore } from '@/features/desktop/stores/desktop.store';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { createWindowConfig } from '@/lib/window-utils';
import { useService } from '@/providers/service-provider';
import type { ModuleWindowService } from '@/services/module-window';
import { getAppIdForModule } from '@/services/module-window';
import { useUIStore } from '@/stores/ui-store';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { DESKTOP_CELL_H, DESKTOP_CELL_W } from '@/features/desktop/stores/desktop.store';
import type { DesktopIconData } from '@/types';

function createWindowFromIcon(data: DesktopIconData) {
  const D_W = 960;
  const D_H = 640;
  const id = `window-${data.id}-${Date.now()}`;

  const { width: winWidth, height: winHeight, x: winX, y: winY } = createWindowConfig(D_W, D_H);

  return {
    id,
    title: data.title,
    icon: data.icon,
    appId: data.appId,
    position: { x: winX, y: winY },
    size: { width: winWidth, height: winHeight },
    zIndex: 1,
    state: 'active' as const,
  };
}

export const DesktopGrid = memo(function DesktopGrid() {
  const isMobile = useIsMobile();
  const icons = useDesktopStore((s) => s.icons);
  const refreshKey = useDesktopStore((s) => s.refreshKey);
  const selectedIconId = useDesktopStore((s) => s.selectedIconId);
  const renamingIconId = useDesktopStore((s) => s.renamingIconId);
  const setSelectedIcon = useDesktopStore((s) => s.setSelectedIcon);
  const setRenamingIcon = useDesktopStore((s) => s.setRenamingIcon);
  const renameIcon = useDesktopStore((s) => s.renameIcon);
  const removeIcon = useDesktopStore((s) => s.removeIcon);
  const openWindow = useWindowStore((s) => s.openWindow);
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const moduleWindowService = useService<ModuleWindowService>('moduleWindow');
  const desktopIconsHidden = useDesktopStore((s) => s.desktopIconsHidden);

  const handleOpenIcon = useCallback(
    async (data: DesktopIconData) => {
      try {
        await moduleWindowService.openModule(data.appId);
        return;
      } catch {
        /* not a registered module, fall through */
      }
      const win = createWindowFromIcon(data);
      openWindow(win);
    },
    [openWindow, moduleWindowService],
  );

  const handleDoubleClick = useCallback(
    (data: DesktopIconData) => {
      handleOpenIcon(data);
    },
    [handleOpenIcon],
  );

  const handleIconContextMenu = useCallback(
    (e: React.MouseEvent, icon: DesktopIconData) => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu({ x: e.clientX, y: e.clientY }, [
        { id: 'open', label: 'Open', action: () => handleOpenIcon(icon) },
        { id: 'rename', label: 'Rename', action: () => setRenamingIcon(icon.id) },
        { id: 'sep1', label: '', separator: true },
        { id: 'delete', label: 'Delete', action: () => removeIcon(icon.id) },
      ]);
    },
    [showContextMenu, handleOpenIcon, setRenamingIcon, removeIcon],
  );

  const addIcon = useDesktopStore((s) => s.addIcon);
  const moveIconToCell = useDesktopStore((s) => s.moveIconToCell);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);

  // Native dragover listener — ensures preventDefault() is called every frame
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: DragEvent) => {
      if (
        e.dataTransfer?.types.includes('text/plain') ||
        e.dataTransfer?.types.includes('application/arunaos-module')
      ) {
        e.preventDefault();
      }
    };
    el.addEventListener('dragover', handler);
    return () => el.removeEventListener('dragover', handler);
  }, []);

  const handleContainerDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      // Icons are hidden — an invisible icon would be created silently.
      if (desktopIconsHidden) return;
      const raw = e.dataTransfer.getData('application/arunaos-module');
      if (raw) {
        try {
          const mod = JSON.parse(raw);
          if (mod.id && mod.name) {
            addIcon({
              id: `desktop-${mod.id}-${Date.now()}`,
              title: mod.name,
              icon: mod.icon || 'grid',
              appId: mod.appId || getAppIdForModule(mod.id),
              position: 0,
            });
          }
        } catch {
          /* ignore */
        }
        return;
      }
      const dragId = dragIdRef.current;
      if (!dragId) return;

      // Snap ke sel grid terdekat dari posisi pointer (free positioning).
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pad = isMobile ? 8 : 16;
      const col = Math.round((e.clientX - rect.left - pad) / DESKTOP_CELL_W);
      const row = Math.round((e.clientY - rect.top - pad) / DESKTOP_CELL_H);
      moveIconToCell(dragId, Math.max(0, col), Math.max(0, row));
      dragIdRef.current = null;
    },
    [moveIconToCell, addIcon, desktopIconsHidden, isMobile],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (icons.length === 0) return;
      const currentIdx = icons.findIndex((icon) => icon.id === selectedIconId);
      const safeIdx = currentIdx === -1 ? 0 : currentIdx;

      if (e.key === 'Tab') {
        e.preventDefault();
        const direction = e.shiftKey ? -1 : 1;
        const nextIdx = (safeIdx + direction + icons.length) % icons.length;
        const nextIcon = icons[nextIdx];
        if (nextIcon) setSelectedIcon(nextIcon.id);
        return;
      }

      if (e.key === 'Enter') {
        const selected = icons.find((icon) => icon.id === selectedIconId);
        if (selected) handleDoubleClick(selected);
      }
    },
    [icons, selectedIconId, setSelectedIcon, handleDoubleClick],
  );

  return (
    <div
      ref={containerRef}
      key={refreshKey}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onDrop={handleContainerDrop}
      className="absolute inset-0 outline-none"
    >
      <div
        className={cn('pointer-events-none absolute inset-0', isMobile ? 'p-2 pt-2' : 'p-4 pt-6')}
      >
        {!desktopIconsHidden &&
          icons.map((icon) => (
            <div
              key={icon.id}
              data-desktop-icon
              draggable
              className="pointer-events-auto absolute touch-manipulation"
              style={{
                left: (icon.position ?? 0) * DESKTOP_CELL_W,
                top: (icon.row ?? 0) * DESKTOP_CELL_H,
              }}
              onContextMenu={(e) => handleIconContextMenu(e, icon)}
              onDragStart={(e) => {
                dragIdRef.current = icon.id;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', icon.id);
              }}
              onDragEnd={() => {
                dragIdRef.current = null;
              }}
              onTouchStart={(e) => {
                const t = e.touches[0];
                if (!t) return;
                dragIdRef.current = icon.id;
                const el = e.currentTarget as HTMLElement;
                el.dataset.startX = String(t.clientX);
                el.dataset.startY = String(t.clientY);
                const timer = window.setTimeout(() => {
                  handleIconContextMenu(
                    {
                      clientX: t.clientX,
                      clientY: t.clientY,
                      preventDefault: () => {},
                      stopPropagation: () => {},
                    } as unknown as React.MouseEvent,
                    icon,
                  );
                  dragIdRef.current = null;
                }, 550);
                el.dataset.longPressTimer = String(timer);
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
                }
              }}
              onTouchEnd={(e) => {
                const el = e.currentTarget as HTMLElement;
                const timer = Number(el.dataset.longPressTimer || 0);
                if (timer) window.clearTimeout(timer);
                const t = e.changedTouches[0];
                if (!t || !dragIdRef.current) return;
                // if moved significantly, treat as drag drop
                const sx = Number(el.dataset.startX || 0);
                const sy = Number(el.dataset.startY || 0);
                if (Math.hypot(t.clientX - sx, t.clientY - sy) < 10) {
                  dragIdRef.current = null;
                  return;
                }
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const pad = isMobile ? 8 : 16;
                const col = Math.round((t.clientX - rect.left - pad) / DESKTOP_CELL_W);
                const row = Math.round((t.clientY - rect.top - pad) / DESKTOP_CELL_H);
                moveIconToCell(dragIdRef.current, Math.max(0, col), Math.max(0, row));
                dragIdRef.current = null;
              }}
            >
              <DesktopIcon
                data={icon}
                isSelected={selectedIconId === icon.id}
                isRenaming={renamingIconId === icon.id}
                onSelect={setSelectedIcon}
                onDoubleClick={handleDoubleClick}
                onRename={renameIcon}
                onRenameCancel={() => setRenamingIcon(null)}
              />
            </div>
          ))}
      </div>
    </div>
  );
});
