'use client';

import { memo, useCallback, useRef, useState } from 'react';
import { DesktopIcon } from '@/features/desktop-icons/components/desktop-icon';
import { useDesktopStore } from '@/features/desktop/stores/desktop.store';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { useUIStore } from '@/stores/ui-store';
import type { DesktopIconData } from '@/types';

function createWindowFromIcon(data: DesktopIconData) {
  const id = `window-${data.id}-${Date.now()}`;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

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

  const dragItemIndex = useRef<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDoubleClick = useCallback(
    (data: DesktopIconData) => {
      const win = createWindowFromIcon(data);
      openWindow(win);
    },
    [openWindow],
  );

  const handleIconContextMenu = useCallback(
    (e: React.MouseEvent, icon: DesktopIconData) => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu({ x: e.clientX, y: e.clientY }, [
        {
          id: 'open',
          label: 'Open',
          action: () => {
            const win = createWindowFromIcon(icon);
            openWindow(win);
          },
        },
        { id: 'rename', label: 'Rename', action: () => setRenamingIcon(icon.id) },
        { id: 'sep1', label: '', action: () => {}, separator: true },
        {
          id: 'delete',
          label: 'Delete',
          action: () => removeIcon(icon.id),
        },
      ]);
    },
    [showContextMenu, openWindow, setRenamingIcon, removeIcon],
  );

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragItemIndex.current = index;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.setDragImage(new Image(), 0, 0);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [dragOverIndex],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = dragItemIndex.current;
      if (fromIndex !== null && fromIndex !== toIndex) {
        moveIcon(fromIndex, toIndex);
      }
      dragItemIndex.current = null;
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [moveIcon],
  );

  const handleDragEnd = useCallback(() => {
    dragItemIndex.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

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
        if (selected) {
          handleDoubleClick(selected);
        }
      }
    },
    [icons, selectedIconId, setSelectedIcon, handleDoubleClick],
  );

  return (
    <div
      key={refreshKey}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex flex-wrap content-start gap-2 p-4 pt-6 outline-none"
      style={{ maxWidth: 96 * 4 + 32 }}
    >
      {icons.map((icon, index) => {
        const isDragOver = dragOverIndex === index && draggedIndex !== index;
        return (
          <div
            key={icon.id}
            draggable
            onContextMenu={(e) => handleIconContextMenu(e, icon)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`transition-all duration-150 ${
              isDragOver ? 'scale-95 opacity-50' : ''
            } ${draggedIndex === index ? 'opacity-60' : ''}`}
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
        );
      })}
    </div>
  );
});
