'use client';

import { useEffect, type ReactNode } from 'react';
import { Wallpaper } from '@/features/wallpaper/components/wallpaper';
import { MenuBar } from '@/features/menu-bar/components/menu-bar';
import { Dock } from '@/features/dock/components/dock';
import { WindowManager } from '@/features/window-manager/components/window-manager';
import { ContextMenu } from '@/features/context-menu/components/context-menu';
import { Overlay } from '@/features/overlay/components/overlay';
import { AuthGate } from '@/features/auth/components/auth-gate';
import { useShortcutManager } from '@/hooks/use-shortcut-manager';
import { useIdleTimer } from '@/hooks/use-idle-timer';
import { useIsMobile } from '@/hooks/use-media-query';
import { ScreensaverOverlay } from '@/features/menu-bar/components/screensaver-overlay';
import { ToastContainer } from '@/services/notification/components/notification-ui';
import { ModalRenderer } from '@/services/modal/modal-service';
import { CommandPaletteProvider } from '@/features/command-palette/command-palette-provider';
import { AICommandBarProvider } from '@/features/ai/ai-command-bar-provider';
import { DebugPanel } from '@/components/debug-panel';
import { useAuthStore } from '@/stores/auth.store';
import { useService } from '@/providers/service-provider';
import type { LifecycleService } from '@/services/lifecycle/lifecycle-service';
import { LocationPermissionDialog } from '@/features/location/location-permission-dialog';
import { useLocationStore, startBackgroundRefresh } from '@/stores/location.store';
function useBackgroundLocationRefresh() {
  const { enabled, permissionAsked } = useLocationStore();

  useEffect(() => {
    if (!enabled || !permissionAsked) return;
    startBackgroundRefresh();
    const id = setInterval(() => startBackgroundRefresh(), 300000);
    return () => clearInterval(id);
  }, [enabled, permissionAsked]);
}

export function DesktopShell({ children }: { children: ReactNode }) {
  useBackgroundLocationRefresh();
  useShortcutManager();
  const isMobile = useIsMobile();

  const lifecycle = useService<LifecycleService>('lifecycle');

  const { showingScreensaver } = useIdleTimer(
    () => useAuthStore.getState().lock(),
    () => lifecycle.sleep(),
  );

  return (
    <AuthGate>
      <div
        className="relative overflow-hidden"
        style={{
          height: '100dvh',
          width: '100dvw',
        }}
      >
        <Wallpaper />
        <MenuBar />
        <main
          className="h-full w-full"
          style={{
            paddingTop: isMobile ? 0 : 32,
            paddingBottom: isMobile ? 0 : 80,
          }}
        >
          {children}
        </main>
        <WindowManager />
        <Dock />
        <div id="portal-root" />
        <ContextMenu />
        <Overlay />
        {showingScreensaver && <ScreensaverOverlay />}
        <ToastContainer />
        <ModalRenderer />
        <CommandPaletteProvider />
        <AICommandBarProvider />
        <DebugPanel />
        <LocationPermissionDialog />
      </div>
    </AuthGate>
  );
}
