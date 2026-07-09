'use client';

import type { ReactNode } from 'react';
import { Wallpaper } from '@/features/wallpaper/components/wallpaper';
import { MenuBar } from '@/features/menu-bar/components/menu-bar';
import { Dock } from '@/features/dock/components/dock';
import { WindowManager } from '@/features/window-manager/components/window-manager';
import { ContextMenu } from '@/features/context-menu/components/context-menu';
import { Overlay } from '@/features/overlay/components/overlay';
import { AuthGate } from '@/features/auth/components/auth-gate';
import { useShortcutManager } from '@/hooks/use-shortcut-manager';
import { ToastContainer } from '@/services/notification/components/notification-ui';
import { ModalRenderer } from '@/services/modal/modal-service';
import { CommandPaletteProvider } from '@/features/command-palette/command-palette-provider';
import { DebugPanel } from '@/components/debug-panel';

export function DesktopShell({ children }: { children: ReactNode }) {
  useShortcutManager();

  return (
    <AuthGate>
      <div className="relative h-screen w-screen overflow-hidden">
        <Wallpaper />
        <MenuBar />
        <main className="h-full w-full pb-20 pt-8">{children}</main>
        <WindowManager />
        <Dock />
        <div id="portal-root" />
        <ContextMenu />
        <Overlay />
        <ToastContainer />
        <ModalRenderer />
        <CommandPaletteProvider />
        <DebugPanel />
      </div>
    </AuthGate>
  );
}
