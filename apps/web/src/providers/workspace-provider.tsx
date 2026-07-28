'use client';

import { useEffect, type ReactNode } from 'react';
import { useWorkspaceStore } from '@/features/workspace/stores/workspace.store';
import { useWindowStore } from '@/features/window-manager/stores/window.store';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const unsub = useWindowStore.subscribe(
      (state) => state.focusedWindowId,
      (focusedId) => {
        if (focusedId) {
          useWorkspaceStore.getState().setActiveWindow(focusedId);
        }
      },
    );
    return () => unsub();
  }, []);

  return <>{children}</>;
}
