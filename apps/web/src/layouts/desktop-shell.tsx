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
import { useIdleTimer } from '@/hooks/use-idle-timer';
import { ScreensaverOverlay } from '@/features/menu-bar/components/screensaver-overlay';
import { ToastContainer } from '@/services/notification/components/notification-ui';
import { ModalRenderer } from '@/services/modal/modal-service';
import { CommandPaletteProvider } from '@/features/command-palette/command-palette-provider';
import { DebugPanel } from '@/components/debug-panel';
import { useAuthStore } from '@/stores/auth.store';
import { useService } from '@/providers/service-provider';
import type { LifecycleService } from '@/services/lifecycle/lifecycle-service';
export function DesktopShell({ children }: { children: ReactNode }) {
  useShortcutManager();

  const lifecycle = useService<LifecycleService>('lifecycle');

  const { showingScreensaver } = useIdleTimer(
    () => useAuthStore.getState().lock(),
    () => lifecycle.sleep(),
  );

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
        {showingScreensaver && <ScreensaverOverlay />}
        <ToastContainer />
        <ModalRenderer />
        <CommandPaletteProvider />
        <DebugPanel />
      </div>
    </AuthGate>
  );
}
