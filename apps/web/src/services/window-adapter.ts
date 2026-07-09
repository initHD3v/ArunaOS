'use client';

import type { EventBus, Logger } from '@arunaos/services';
import { useWindowStore } from '@/features/window-manager/stores/window.store';

export class WindowAdapter {
  private bus: EventBus;
  private logger: Logger;
  private unsub: (() => void) | null = null;

  constructor(bus: EventBus, logger: Logger) {
    this.bus = bus;
    this.logger = logger;
  }

  init(): void {
    this.unsub = useWindowStore.subscribe((state, prev) => {
      if (state.focusedWindowId !== prev.focusedWindowId) {
        this.logger.debug('WindowAdapter', `Active window changed: ${state.focusedWindowId}`);
        this.bus.emit('window:focused', { windowId: state.focusedWindowId });
      }
    });
    this.logger.info('WindowAdapter', 'Initialized');
  }

  getActiveWindow(): string | null {
    return useWindowStore.getState().focusedWindowId;
  }

  destroy(): void {
    this.unsub?.();
    this.unsub = null;
  }
}
