import type { IPCMessage } from './types';

type EventHandler<T = unknown> = (payload: T) => void;

interface EventBus {
  on<T>(event: string, handler: EventHandler<T>): () => void;
  off<T>(event: string, handler: EventHandler<T>): void;
  emit<T>(event: string, payload: T): void;
  clear(): void;
}

let messageCounter = 0;

export class ModuleIPC {
  private bus: EventBus;
  private boundHandleMessage: (msg: IPCMessage) => void;
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();
  private requestHandler: ((msg: IPCMessage) => Promise<void>) | null = null;

  constructor(bus: EventBus) {
    this.bus = bus;
    this.boundHandleMessage = this.handleMessage.bind(this);
    this.bus.on('module:ipc', this.boundHandleMessage);
  }

  setRequestHandler(handler: ((msg: IPCMessage) => Promise<void>) | null): void {
    this.requestHandler = handler;
  }

  private nextId(): string {
    messageCounter++;
    return `msg_${Date.now()}_${messageCounter}`;
  }

  private handleMessage(msg: IPCMessage): void {
    if (msg.type === 'response') {
      const pending = this.pendingRequests.get(msg.id);
      if (!pending) return;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(msg.id);
      if (msg.error) {
        pending.reject(new Error(msg.error));
      } else {
        pending.resolve(msg.payload);
      }
      return;
    }
    if (msg.type === 'request' && this.requestHandler) {
      this.requestHandler(msg).catch((err) => {
        this.respond(msg, null, err instanceof Error ? err.message : String(err));
      });
    }
  }

  async request<T = unknown>(
    targetModuleId: string,
    method: string,
    params?: unknown,
    timeoutMs = 5000,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.nextId();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new Error(
            `IPC request '${method}' to '${targetModuleId}' timed out after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      const msg: IPCMessage = {
        id,
        type: 'request',
        source: 'system',
        target: targetModuleId,
        method,
        payload: params,
        timestamp: Date.now(),
      };
      this.bus.emit('module:ipc', msg);
    });
  }

  respond(msg: IPCMessage, payload: unknown, error?: string): void {
    const response: IPCMessage = {
      id: msg.id,
      type: 'response',
      source: msg.target ?? 'unknown',
      target: msg.source,
      payload,
      error,
      timestamp: Date.now(),
    };
    this.bus.emit('module:ipc', response);
  }

  onEvent(sourceModuleId: string, event: string, handler: (payload: unknown) => void): () => void {
    return this.bus.on('module:ipc', (msg: IPCMessage) => {
      if (msg.type === 'event' && msg.source === sourceModuleId && msg.event === event) {
        handler(msg.payload);
      }
    });
  }

  emit(sourceModuleId: string, event: string, payload: unknown): void {
    const msg: IPCMessage = {
      id: this.nextId(),
      type: 'event',
      source: sourceModuleId,
      event,
      payload,
      timestamp: Date.now(),
    };
    this.bus.emit('module:ipc', msg);
  }

  broadcast(event: string, payload: unknown): void {
    const msg: IPCMessage = {
      id: this.nextId(),
      type: 'broadcast',
      source: 'system',
      event,
      payload,
      timestamp: Date.now(),
    };
    this.bus.emit('module:ipc', msg);
  }

  destroy(): void {
    this.bus.off('module:ipc', this.boundHandleMessage);
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('IPC destroyed'));
    }
    this.pendingRequests.clear();
  }
}
