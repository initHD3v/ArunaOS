type EventHandler<T = unknown> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();
  private wildcard: Set<EventHandler<{ event: string; payload: unknown }>> | null = null;

  emit<T>(event: string, payload: T): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(payload);
      }
    }
    if (this.wildcard) {
      for (const handler of this.wildcard) {
        handler({ event, payload });
      }
    }
  }

  emitAsync<T>(event: string, payload: T): Promise<void> {
    return new Promise((resolve) => {
      queueMicrotask(() => {
        this.emit(event, payload);
        resolve();
      });
    });
  }

  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);
    return () => {
      this.listeners.get(event)?.delete(handler as EventHandler);
      if (this.listeners.get(event)?.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  once<T>(event: string, handler: EventHandler<T>): void {
    const wrapper: EventHandler<T> = (payload) => {
      handler(payload);
      this.off(event, wrapper as EventHandler);
    };
    this.on(event, wrapper as EventHandler);
  }

  off<T>(event: string, handler: EventHandler<T>): void {
    this.listeners.get(event)?.delete(handler as EventHandler);
    if (this.listeners.get(event)?.size === 0) {
      this.listeners.delete(event);
    }
  }

  onAny(handler: EventHandler<{ event: string; payload: unknown }>): () => void {
    if (!this.wildcard) {
      this.wildcard = new Set();
    }
    this.wildcard.add(handler);
    return () => {
      this.wildcard?.delete(handler);
      if (this.wildcard?.size === 0) {
        this.wildcard = null;
      }
    };
  }

  clear(): void {
    this.listeners.clear();
    this.wildcard = null;
  }

  listenerCount(event?: string): number {
    if (event) {
      return this.listeners.get(event)?.size ?? 0;
    }
    let count = 0;
    for (const handlers of this.listeners.values()) {
      count += handlers.size;
    }
    return count + (this.wildcard?.size ?? 0);
  }
}
