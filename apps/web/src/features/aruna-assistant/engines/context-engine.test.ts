import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContextEngine } from './context-engine';

describe('ContextEngine', () => {
  let engine: ContextEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T10:00:00')); // Sunday morning
    engine = new ContextEngine();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('has correct name', () => {
    expect(engine.name).toBe('context');
  });

  it('returns null context before init', () => {
    expect(engine.current).toBeNull();
  });

  it('collects context on init', async () => {
    await engine.init();
    const ctx = engine.current;
    expect(ctx).not.toBeNull();
    expect(ctx!.time.hour).toBe(10);
    expect(ctx!.time.timeOfDay).toBe('morning');
    expect(ctx!.time.dayOfWeek).toBe(0); // Sunday
    expect(ctx!.workspace).toBeDefined();
    expect(ctx!.notifications).toBeDefined();
    expect(ctx!.system).toBeDefined();
  });

  it('determines afternoon correctly', async () => {
    vi.setSystemTime(new Date('2026-07-12T14:00:00'));
    engine = new ContextEngine();
    await engine.init();
    expect(engine.current!.time.timeOfDay).toBe('afternoon');
  });

  it('determines evening correctly', async () => {
    vi.setSystemTime(new Date('2026-07-12T17:00:00'));
    engine = new ContextEngine();
    await engine.init();
    expect(engine.current!.time.timeOfDay).toBe('evening');
  });

  it('determines night correctly', async () => {
    vi.setSystemTime(new Date('2026-07-12T22:00:00'));
    engine = new ContextEngine();
    await engine.init();
    expect(engine.current!.time.timeOfDay).toBe('night');
  });

  it('notifies listeners on context change', async () => {
    const listener = vi.fn();
    engine.onContextChange(listener);
    await engine.init();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(engine.current);
  });

  it('removes listener on unsubscribe', async () => {
    const listener = vi.fn();
    const unsub = engine.onContextChange(listener);
    unsub();
    await engine.init();
    expect(listener).not.toHaveBeenCalled();
  });

  it('destroys stops updates', async () => {
    await engine.init();
    const ctxBefore = engine.current;
    engine.destroy();
    // Should not update context anymore
    expect(engine.current).not.toBeNull();
    expect(engine.current).toBe(ctxBefore);
  });
});
