'use client';

import { useEffect, type ReactNode } from 'react';
import { useWorkspaceStore } from '@/features/workspace/stores/workspace.store';
import { useWindowStore } from '@/features/window-manager/stores/window.store';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const syncActiveWindow = () => {
      const focusedId = useWindowStore.getState().focusedWindowId;
      if (focusedId) {
        useWorkspaceStore.getState().setActiveWindow(focusedId);
      }
    };
    const unsub = useWindowStore.subscribe(() => syncActiveWindow());
    return () => unsub();
  }, []);

  return <>{children}</>;
}
