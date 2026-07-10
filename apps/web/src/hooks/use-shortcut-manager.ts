'use client';

import { useEffect } from 'react';
import { useService, useEventBus, useLogger } from '@/providers/service-provider';
import type { ShortcutService } from '@/services/shortcut/shortcut-service';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { useOverlayStore } from '@/features/overlay/stores/overlay.store';
import { useUIStore } from '@/stores/ui-store';

export function useShortcutManager() {
  const shortcut = useService<ShortcutService>('shortcut');
  const bus = useEventBus();
  const logger = useLogger();

  useEffect(() => {
    const winStore = useWindowStore.getState();

    shortcut.register(
      'cmd-k',
      'meta+k',
      () => {
        document.querySelector<HTMLButtonElement>('[data-command-palette-trigger]')?.click();
      },
      { context: 'global', description: 'Open Command Palette' },
    );

    shortcut.register(
      'cmd-w',
      'meta+w',
      () => {
        const focusedId = useWindowStore.getState().focusedWindowId;
        if (focusedId) winStore.closeWindow(focusedId);
      },
      { context: 'window', description: 'Close focused window' },
    );

    shortcut.register(
      'cmd-tab',
      'ctrl+]',
      () => {
        const ws = useWindowStore.getState();
        const ids = Object.keys(ws.windows);
        if (ids.length > 1) {
          const currentIdx = ws.focusedWindowId ? ids.indexOf(ws.focusedWindowId) : -1;
          const nextIdx = (currentIdx + 1) % ids.length;
          const nextId = ids[nextIdx === -1 ? 0 : nextIdx];
          if (nextId) ws.focusWindow(nextId);
        }
      },
      { context: 'global', description: 'Switch windows forward' },
    );

    shortcut.register(
      'cmd-shift-tab',
      'ctrl+[',
      () => {
        const ws = useWindowStore.getState();
        const ids = Object.keys(ws.windows);
        if (ids.length > 1) {
          const currentIdx = ws.focusedWindowId ? ids.indexOf(ws.focusedWindowId) : -1;
          const prevIdx = currentIdx <= 0 ? ids.length - 1 : currentIdx - 1;
          const prevId = ids[prevIdx];
          if (prevId) ws.focusWindow(prevId);
        }
      },
      { context: 'global', description: 'Switch windows backward' },
    );

    shortcut.register(
      'escape-global',
      'escape',
      () => {
        const overlayStore = useOverlayStore.getState();
        if (overlayStore.visible) {
          overlayStore.hideOverlay();
          return;
        }

        const uiStore = useUIStore.getState();
        if (uiStore.contextMenu.visible) {
          uiStore.hideContextMenu();
          return;
        }

        const focusedId = useWindowStore.getState().focusedWindowId;
        if (focusedId) {
          const w = useWindowStore.getState().windows[focusedId];
          if (w?.state === 'maximized') winStore.restoreWindow(focusedId);
        }
      },
      { context: 'global', description: 'Close overlay/menu, restore window' },
    );

    logger.info('ShortcutManager', 'Shortcuts registered');
    const unsubModalOpen = bus.on('modal:opened', () => shortcut.setInputActive(true));
    const unsubModalClose = bus.on('modal:closed', () => shortcut.setInputActive(false));

    return () => {
      shortcut.unregister('cmd-k');
      shortcut.unregister('cmd-w');
      shortcut.unregister('cmd-tab');
      shortcut.unregister('cmd-shift-tab');
      shortcut.unregister('escape-global');
      unsubModalOpen();
      unsubModalClose();
    };
  }, [shortcut, bus, logger]);

  useEffect(() => {
    const unsub = shortcut.mount();
    logger.info('ShortcutManager', 'Mounted keyboard listener');
    return () => {
      unsub();
      logger.info('ShortcutManager', 'Unmounted keyboard listener');
    };
  }, [shortcut, logger]);
}
