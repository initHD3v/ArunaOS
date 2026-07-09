'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { useOverlayStore } from '@/features/overlay/stores/overlay.store';

export function useGlobalKeys() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const meta = e.metaKey || e.ctrlKey;
      const winStore = useWindowStore.getState();
      const focusedId = winStore.focusedWindowId;

      if (e.key === 'Escape') {
        const uiStore = useUIStore.getState();
        if (uiStore.contextMenu.visible) {
          uiStore.hideContextMenu();
          e.preventDefault();
          return;
        }

        const overlayStore = useOverlayStore.getState();
        if (overlayStore.visible) {
          overlayStore.hideOverlay();
          e.preventDefault();
          return;
        }

        if (focusedId && winStore.windows[focusedId]?.state === 'maximized') {
          winStore.restoreWindow(focusedId);
          e.preventDefault();
          return;
        }
      }

      if (meta && (e.key === 'Tab' || e.keyCode === 9)) {
        e.preventDefault();
        const winIds = Object.keys(winStore.windows);
        if (winIds.length > 1) {
          const currentIdx = focusedId ? winIds.indexOf(focusedId) : -1;
          const safeIdx = currentIdx === -1 ? 0 : currentIdx;
          const nextIdx = e.shiftKey
            ? (safeIdx - 1 + winIds.length) % winIds.length
            : (safeIdx + 1) % winIds.length;
          const nextWinId = winIds[nextIdx];
          if (nextWinId) winStore.focusWindow(nextWinId);
        }
      }

      if (meta && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        if (focusedId) {
          winStore.closeWindow(focusedId);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
