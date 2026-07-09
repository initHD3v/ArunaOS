import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../event-bus';

describe('EventBus', () => {
  it('should call handler on emit', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('test:event', handler);
    bus.emit('test:event', { data: 1 });
    expect(handler).toHaveBeenCalledWith({ data: 1 });
  });

  it('should pass payload to handler', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('user:login', handler);
    bus.emit('user:login', { id: '42', name: 'test' });
    expect(handler).toHaveBeenCalledWith({ id: '42', name: 'test' });
  });

  it('should support multiple listeners for same event', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('test:event', h1);
    bus.on('test:event', h2);
    bus.emit('test:event', {});
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('should not call handler after unsubscribe', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.on('test:event', handler);
    unsub();
    bus.emit('test:event', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('should only call once handler once', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.once('test:event', handler);
    bus.emit('test:event', {});
    bus.emit('test:event', {});
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support off to remove handler', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('test:event', handler);
    bus.off('test:event', handler);
    bus.emit('test:event', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('should not throw when emitting event with no listeners', () => {
    const bus = new EventBus();
    expect(() => bus.emit('nonexistent', {})).not.toThrow();
  });

  it('should clear all listeners', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('a', h1);
    bus.on('b', h2);
    bus.clear();
    bus.emit('a', {});
    bus.emit('b', {});
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it('should call onAny wildcard handler for all events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.onAny(handler);
    bus.emit('foo', 1);
    bus.emit('bar', 2);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith({ event: 'foo', payload: 1 });
    expect(handler).toHaveBeenCalledWith({ event: 'bar', payload: 2 });
  });

  it('should return 0 listener count for unknown event', () => {
    const bus = new EventBus();
    expect(bus.listenerCount('nonexistent')).toBe(0);
  });

  it('should not leak memory after unsubscribe', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.on('test:event', handler);
    unsub();
    expect(bus.listenerCount('test:event')).toBe(0);
  });

  it('should support multiple unsubscribes independently', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    const unsub1 = bus.on('test:event', h1);
    const unsub2 = bus.on('test:event', h2);
    unsub1();
    bus.emit('test:event', {});
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledTimes(1);
    unsub2();
    expect(bus.listenerCount('test:event')).toBe(0);
  });

  it('should emitAsync via microtask', async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('test:event', handler);
    bus.emitAsync('test:event', {});
    expect(handler).not.toHaveBeenCalled();
    await new Promise(process.nextTick);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should clean up wildcard listener', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.onAny(handler);
    unsub();
    bus.emit('test', {});
    expect(handler).not.toHaveBeenCalled();
    expect(bus.listenerCount()).toBe(0);
  });
});
