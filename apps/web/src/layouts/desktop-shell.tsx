'use client';

import type { ReactNode } from 'react';
import { Wallpaper } from '@/features/wallpaper/components/wallpaper';
import { MenuBar } from '@/features/menu-bar/components/menu-bar';
import { Dock } from '@/features/dock/components/dock';
import { WindowManager } from '@/features/window-manager/components/window-manager';
import { ContextMenu } from '@/features/context-menu/components/context-menu';
import { Overlay } from '@/features/overlay/components/overlay';
import { useGlobalKeys } from '@/hooks/use-global-keys';

export function DesktopShell({ children }: { children: ReactNode }) {
  useGlobalKeys();

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Wallpaper />
      <MenuBar />
      <main className="h-full w-full pb-20 pt-8">{children}</main>
      <WindowManager />
      <Dock />
      <div id="portal-root" />
      <ContextMenu />
      <Overlay />
    </div>
  );
}
