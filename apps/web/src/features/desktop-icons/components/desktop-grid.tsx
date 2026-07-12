'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import { DesktopIcon } from '@/features/desktop-icons/components/desktop-icon';
import { useDesktopStore } from '@/features/desktop/stores/desktop.store';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { useService } from '@/providers/service-provider';
import type { ModuleWindowService } from '@/services/module-window';
import { getAppIdForModule } from '@/services/module-window';
import { useUIStore } from '@/stores/ui-store';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import type { DesktopIconData } from '@/types';

function createWindowFromIcon(data: DesktopIconData) {
  const id = `window-${data.id}-${Date.now()}`;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobile = viewportWidth < 768;

  if (isMobile) {
    const MENUBAR_HEIGHT = 44;
    const DOCK_HEIGHT = 64;
    return {
      id,
      title: data.title,
      icon: data.icon,
      appId: data.appId,
      position: { x: 0, y: MENUBAR_HEIGHT },
      size: { width: viewportWidth, height: viewportHeight - MENUBAR_HEIGHT - DOCK_HEIGHT },
      zIndex: 1,
      state: 'active' as const,
    };
  }

  return {
    id,
    title: data.title,
    icon: data.icon,
    appId: data.appId,
    position: {
      x: Math.max(40, (viewportWidth - 960) / 2 + Math.random() * 80),
      y: Math.max(40, (viewportHeight - 640) / 2 + Math.random() * 40),
    },
    size: { width: 960, height: 640 },
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
  const moveIcon = useDesktopStore((s) => s.moveIcon);
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
        { id: 'sep1', label: '', action: () => {}, separator: true },
        { id: 'delete', label: 'Delete', action: () => removeIcon(icon.id) },
      ]);
    },
    [showContextMenu, handleOpenIcon, setRenamingIcon, removeIcon],
  );

  const addIcon = useDesktopStore((s) => s.addIcon);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<number | null>(null);

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
      const fromIdx = dragRef.current;
      if (fromIdx === null) return;
      const fromStr = e.dataTransfer.getData('text/plain');
      if (!fromStr) return;
      const parsed = parseInt(fromStr, 10);
      if (isNaN(parsed)) return;
      const containerEl = containerRef.current;
      if (!containerEl) return;
      const children = Array.from(containerEl.children) as HTMLElement[];
      let toIdx = children.length - 1;
      for (let i = 0; i < children.length; i++) {
        const rect = children[i]!.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          toIdx = i;
          break;
        }
      }
      if (parsed !== toIdx) moveIcon(parsed, toIdx);
      dragRef.current = null;
    },
    [moveIcon, addIcon],
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
      onContextMenu={(e) => e.stopPropagation()}
      onDrop={handleContainerDrop}
      className={cn(
        'flex flex-wrap content-start gap-2 outline-none',
        isMobile ? 'gap-1 p-2 pt-2' : 'p-4 pt-6',
      )}
      style={{
        maxWidth: isMobile ? '100%' : 96 * 4 + 32,
      }}
    >
      {!desktopIconsHidden &&
        icons.map((icon, index) => (
          <div
            key={icon.id}
            data-desktop-icon
            draggable
            onContextMenu={(e) => handleIconContextMenu(e, icon)}
            onDragStart={(e) => {
              dragRef.current = index;
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(index));
            }}
            onDragEnd={() => {
              dragRef.current = null;
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
  );
});
