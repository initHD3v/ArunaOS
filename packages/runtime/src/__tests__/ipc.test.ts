import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModuleIPC } from '../ipc';
import type { IPCMessage } from '../types';

interface EventHandler<T = unknown> {
  (payload: T): void;
}

class MockEventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as EventHandler);
    return () => this.handlers.get(event)?.delete(handler as EventHandler);
  }

  off<T>(event: string, handler: EventHandler<T>): void {
    this.handlers.get(event)?.delete(handler as EventHandler);
  }

  emit(event: string, payload: unknown): void {
    this.handlers.get(event)?.forEach((h) => h(payload));
  }

  clear(): void {
    this.handlers.clear();
  }
}

describe('ModuleIPC', () => {
  let bus: MockEventBus;
  let ipc: ModuleIPC;

  beforeEach(() => {
    bus = new MockEventBus();
    ipc = new ModuleIPC(bus);
  });

  it('should send a request and receive response', async () => {
    // Set up listener to respond
    bus.on('module:ipc', (msg: IPCMessage) => {
      if (msg.type === 'request' && msg.method === 'getData') {
        // Respond after a tick
        setTimeout(() => {
          ipc.respond(msg, { data: 'ok' });
        }, 10);
      }
    });

    const result = await ipc.request('mod.target', 'getData', { id: 1 }, 1000);
    expect(result).toEqual({ data: 'ok' });
  });

  it('should reject on timeout', async () => {
    await expect(ipc.request('mod.target', 'slowMethod', {}, 50)).rejects.toThrow('timed out');
  }, 10000);

  it('should register event listener and receive events', () => {
    const handler = vi.fn();
    ipc.onEvent('mod.source', 'dataUpdated', handler);

    ipc.emit('mod.source', 'dataUpdated', { id: 1 });
    expect(handler).toHaveBeenCalledWith({ id: 1 });
  });

  it('should not fire handler for different module', () => {
    const handler = vi.fn();
    ipc.onEvent('mod.source', 'dataUpdated', handler);

    ipc.emit('mod.other', 'dataUpdated', { id: 2 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should not fire handler for different event', () => {
    const handler = vi.fn();
    ipc.onEvent('mod.source', 'eventA', handler);

    ipc.emit('mod.source', 'eventB', { id: 2 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should respond to a request', () => {
    const requestMsg = {
      id: 'msg_1',
      type: 'request' as const,
      source: 'mod.caller',
      target: 'mod.target',
      method: 'ping',
      timestamp: Date.now(),
    };

    const spy = vi.spyOn(bus, 'emit');
    ipc.respond(requestMsg, 'pong');

    expect(spy).toHaveBeenCalledWith(
      'module:ipc',
      expect.objectContaining({
        id: 'msg_1',
        type: 'response',
        payload: 'pong',
      }),
    );
  });

  it('should respond with error', () => {
    const requestMsg = {
      id: 'msg_2',
      type: 'request' as const,
      source: 'mod.caller',
      target: 'mod.target',
      method: 'fail',
      timestamp: Date.now(),
    };

    const spy = vi.spyOn(bus, 'emit');
    ipc.respond(requestMsg, null, 'Something went wrong');

    expect(spy).toHaveBeenCalledWith(
      'module:ipc',
      expect.objectContaining({
        type: 'response',
        error: 'Something went wrong',
      }),
    );
  });

  it('should broadcast to all modules', () => {
    const spy = vi.spyOn(bus, 'emit');
    ipc.broadcast('systemEvent', { severity: 'info' });

    expect(spy).toHaveBeenCalledWith(
      'module:ipc',
      expect.objectContaining({
        type: 'broadcast',
        event: 'systemEvent',
      }),
    );
  });

  it('should reject pending requests on destroy', async () => {
    // Create a pending request that will be destroyed
    const reqPromise = ipc.request('mod.target', 'method', {}, 5000);
    ipc.destroy();
    await expect(reqPromise).rejects.toThrow('IPC destroyed');
  });

  it('should not allow new requests after destroy', async () => {
    ipc.destroy();
    await expect(ipc.request('mod.target', 'method', {}, 100)).rejects.toThrow();
  });

  it('should unsubscribe event listener', () => {
    const handler = vi.fn();
    const unsub = ipc.onEvent('mod.source', 'event', handler);
    unsub();
    ipc.emit('mod.source', 'event', {});
    expect(handler).not.toHaveBeenCalled();
  });
});
