'use client';

import { useCallback, useMemo } from 'react';
import { DesktopShell } from '@/layouts/desktop-shell';
import { DesktopGrid } from '@/features/desktop-icons/components/desktop-grid';
import { Selection } from '@/features/selection/components/selection';
import { ArunaAssistant } from '@/features/aruna-assistant/aruna-assistant';
import { useUIStore } from '@/stores/ui-store';
import { useDesktopStore } from '@/features/desktop/stores/desktop.store';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { useService } from '@/providers/service-provider';
import type { SettingsService } from '@arunaos/services';
import type { DesktopIconData } from '@/types';

export default function Home() {
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const addIcon = useDesktopStore((s) => s.addIcon);
  const triggerRefresh = useDesktopStore((s) => s.triggerRefresh);
  const desktopIconsHidden = useDesktopStore((s) => s.desktopIconsHidden);
  const toggleDesktopIcons = useDesktopStore((s) => s.toggleDesktopIcons);
  const openWindow = useWindowStore((s) => s.openWindow);
  const settingsService = useService<SettingsService>('settings');

  const cycleWallpaper = useCallback(() => {
    const cfg = settingsService.get('wallpaper');
    const types: Record<string, 'default' | 'gradient' | 'image'> = {
      default: 'gradient',
      gradient: 'image',
      image: 'default',
    };
    const nextType = types[cfg.type] ?? 'default';
    settingsService.set('wallpaper', {
      ...cfg,
      type: nextType,
      imagePath: nextType === 'image' && !cfg.imagePath ? '' : cfg.imagePath,
    });
  }, [settingsService]);

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
      { id: 'sep1', label: '', action: () => {}, separator: true },
      {
        id: 'view',
        label: desktopIconsHidden ? 'Tampilkan Icons' : 'Sembunyikan Icons',
        action: toggleDesktopIcons,
      },
      { id: 'sep2', label: '', action: () => {}, separator: true },
      { id: 'refresh', label: 'Refresh', action: triggerRefresh },
      { id: 'sep3', label: '', action: () => {}, separator: true },
      { id: 'wallpaper', label: 'Change Wallpaper', action: cycleWallpaper },
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
    ],
    [addIcon, triggerRefresh, cycleWallpaper, openWindow, desktopIconsHidden, toggleDesktopIcons],
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
      <div className="relative h-full w-full" onContextMenu={handleContextMenu}>
        <Selection />
        <DesktopGrid />
        <ArunaAssistant />
      </div>
    </DesktopShell>
  );
}
