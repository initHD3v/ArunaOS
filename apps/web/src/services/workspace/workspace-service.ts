'use client';

import type { EventBus, Logger } from '@arunaos/services';
import { useWindowStore } from '@/features/window-manager/stores/window.store';
import { useWorkspaceStore } from '@/features/workspace/stores/workspace.store';

export interface Workspace {
  id: string;
  name: string;
  activeWindowId: string | null;
}

export class WorkspaceService {
  private bus: EventBus;
  private logger: Logger;
  private workspaceUnsub: (() => void) | null = null;

  constructor(bus: EventBus, logger: Logger) {
    this.bus = bus;
    this.logger = logger;
  }

  init(): void {
    this.workspaceUnsub = useWorkspaceStore.subscribe((state, prev) => {
      if (state.activeWorkspaceId !== prev.activeWorkspaceId) {
        this.logger.debug(
          'WorkspaceService',
          `Active workspace changed: ${state.activeWorkspaceId}`,
        );
        this.bus.emit('workspace:changed', { workspaceId: state.activeWorkspaceId });
      }
    });
    this.logger.info('WorkspaceService', 'Initialized');
  }

  getActiveWorkspace(): Workspace {
    const store = useWorkspaceStore.getState();
    const data = store.workspaces[store.activeWorkspaceId];
    if (!data) {
      return { id: 'main', name: 'Main', activeWindowId: null };
    }
    return {
      id: data.id,
      name: data.name,
      activeWindowId: data.activeWindowId,
    };
  }

  getWorkspaces(): Workspace[] {
    return Object.values(useWorkspaceStore.getState().workspaces);
  }

  setActiveWorkspace(id: string): void {
    useWorkspaceStore.setState({ activeWorkspaceId: id });
  }

  getActiveWindow(): string | null {
    return useWindowStore.getState().focusedWindowId;
  }

  setActiveWindow(windowId: string): void {
    useWindowStore.getState().focusWindow(windowId);
    useWorkspaceStore.getState().setActiveWindow(windowId);
  }

  getRecentWindows(): string[] {
    const windows = useWindowStore.getState().windows;
    return Object.values(windows)
      .sort((a, b) => b.zIndex - a.zIndex)
      .slice(0, 5)
      .map((w) => w.id);
  }

  destroy(): void {
    this.workspaceUnsub?.();
    this.workspaceUnsub = null;
  }
}
