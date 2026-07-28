'use client';

import { useEffect, type ReactNode } from 'react';
import { useWorkspaceStore } from '@/features/workspace/stores/workspace.store';
import { useWindowStore } from '@/features/window-manager/stores/window.store';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const unsub = useWindowStore.subscribe((state, prevState) => {
      if (state.focusedWindowId && state.focusedWindowId !== prevState.focusedWindowId) {
        useWorkspaceStore.getState().setActiveWindow(state.focusedWindowId);
      }
    });
    return () => unsub();
  }, []);

  return <>{children}</>;
}
