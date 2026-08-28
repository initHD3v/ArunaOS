'use client';

import { useCallback, useMemo } from 'react';
import { DesktopShell } from '@/layouts/desktop-shell';
import { DesktopGrid } from '@/features/desktop-icons/components/desktop-grid';
import { Selection } from '@/features/selection/components/selection';
import { ArunaAssistant } from '@/features/aruna-assistant/aruna-assistant';
import { useUIStore } from '@/stores/ui-store';
import { useDesktopStore } from '@/features/desktop/stores/desktop.store';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { useEventBus } from '@/providers/service-provider';
import { useAIContextStore } from '@/stores/ai-context.store';
import type { DesktopIconData } from '@/types';

export default function Home() {
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const addIcon = useDesktopStore((s) => s.addIcon);
  const triggerRefresh = useDesktopStore((s) => s.triggerRefresh);
  const desktopIconsHidden = useDesktopStore((s) => s.desktopIconsHidden);
  const toggleDesktopIcons = useDesktopStore((s) => s.toggleDesktopIcons);
  const openWindow = useWindowStore((s) => s.openWindow);
  const bus = useEventBus();

  const openWallpaperSettings = useCallback(() => {
    openWindow({
      id: `window-settings-${Date.now()}`,
      title: 'Settings',
      icon: 'settings',
      appId: 'settings',
      position: { x: 200, y: 100 },
      size: { width: 800, height: 600 },
      zIndex: 1,
      state: 'active',
    });
    bus.emit('settings:request-tab', { tab: 'appearance' });
  }, [openWindow, bus]);

  const askAI = useAIContextStore((s) => s.askAI);

  const desktopMenuItems = useMemo(
    () => [
      {
        id: 'new-folder',
        label: 'New Folder',
        action: () => {
          const id = `folder-${Date.now()}`;
          const newIcon: DesktopIconData = {
            id,
            title: 'untitled folder',
            icon: 'folder',
            position: 0,
            appId: 'files',
          };
          addIcon(newIcon);
        },
      },
      { id: 'sep1', label: '', separator: true },
      {
        id: 'view',
        label: desktopIconsHidden ? 'Tampilkan Icons' : 'Sembunyikan Icons',
        action: toggleDesktopIcons,
      },
      { id: 'sep2', label: '', separator: true },
      { id: 'refresh', label: 'Refresh', action: triggerRefresh },
      { id: 'sep3', label: '', separator: true },
      { id: 'wallpaper', label: 'Change Wallpaper', action: openWallpaperSettings },
      { id: 'sep4', label: '', action: () => {}, separator: true },
      {
        id: 'settings',
        label: 'Settings',
        action: () => {
          openWindow({
            id: `window-settings-${Date.now()}`,
            title: 'Settings',
            icon: 'settings',
            appId: 'settings',
            position: { x: 200, y: 100 },
            size: { width: 800, height: 600 },
            zIndex: 1,
            state: 'active',
          });
        },
      },
      { id: 'sep5', label: '', separator: true },
      { id: 'ai-ask', label: 'Ask AI...', action: () => askAI() },
      {
        id: 'ai-tips',
        label: 'Productivity Tips',
        action: () => askAI('Give me 3 productivity tips for my current workflow'),
      },
    ],
    [
      addIcon,
      triggerRefresh,
      openWallpaperSettings,
      openWindow,
      desktopIconsHidden,
      toggleDesktopIcons,
      askAI,
    ],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      showContextMenu({ x: e.clientX, y: e.clientY }, desktopMenuItems);
    },
    [showContextMenu, desktopMenuItems],
  );

  return (
    <DesktopShell>
      <div
        className="relative h-full w-full"
        onContextMenu={handleContextMenu}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (!t) return;
          const el = e.currentTarget as HTMLElement;
          el.dataset.startX = String(t.clientX);
          el.dataset.startY = String(t.clientY);
          const timer = window.setTimeout(() => {
            showContextMenu({ x: t.clientX, y: t.clientY }, desktopMenuItems);
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
          const timer = Number((e.currentTarget as HTMLElement).dataset.longPressTimer || 0);
          if (timer) window.clearTimeout(timer);
        }}
        onTouchCancel={(e) => {
          const timer = Number((e.currentTarget as HTMLElement).dataset.longPressTimer || 0);
          if (timer) window.clearTimeout(timer);
        }}
      >
        <Selection />
        <DesktopGrid />
        <ArunaAssistant />
      </div>
    </DesktopShell>
  );
}
