import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModuleStore } from '../store';
import { ModuleRegistry } from '../registry';
import type { ModuleManifest } from '../types';

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
}

const makeManifest = (id: string, name?: string): ModuleManifest => ({
  id,
  name: name ?? id,
  version: '1.0.0',
  description: 'desc',
  icon: 'icon',
  entry: './index',
  type: 'builtin',
});

describe('ModuleStore', () => {
  let registry: ModuleRegistry;
  let bus: MockEventBus;
  let store: ModuleStore;

  beforeEach(() => {
    registry = new ModuleRegistry();
    bus = new MockEventBus();
    store = new ModuleStore(registry, bus, () => false);
  });

  it('should return empty state initially', () => {
    const state = store.getSnapshot();
    expect(state.entries).toHaveLength(0);
    expect(state.activeModuleIds).toHaveLength(0);
    expect(state.loadedModuleIds).toHaveLength(0);
  });

  it('should reflect registered modules', () => {
    registry.register(makeManifest('mod.a'));
    registry.register(makeManifest('mod.b'));
    const state = store.getSnapshot();
    expect(state.entries).toHaveLength(2);
  });

  it('should find entry by id', () => {
    registry.register(makeManifest('mod.a', 'Module A'));
    const state = store.getSnapshot();
    const entry = state.getEntry('mod.a');
    expect(entry?.manifest.name).toBe('Module A');
  });

  it('should return undefined for unknown entry', () => {
    const state = store.getSnapshot();
    expect(state.getEntry('unknown')).toBeUndefined();
  });

  it('should list active modules', () => {
    registry.register(makeManifest('mod.a'));
    registry.setStatus('mod.a', 'active');
    const state = store.getSnapshot();
    expect(state.activeModuleIds).toEqual(['mod.a']);
    const active = state.getActive();
    expect(active).toHaveLength(1);
  });

  it('should reflect loaded modules via isLoaded', () => {
    const loadedStore = new ModuleStore(registry, bus, (id) => id === 'mod.a');
    registry.register(makeManifest('mod.a'));
    registry.register(makeManifest('mod.b'));
    const state = loadedStore.getSnapshot();
    expect(state.loadedModuleIds).toEqual(['mod.a']);
  });

  it('should notify subscribers on registry changes', () => {
    const fn = vi.fn();
    store.subscribe(fn);
    registry.register(makeManifest('mod.a'));
    bus.emit('module:registered', {});
    expect(fn).toHaveBeenCalled();
  });

  it('should provide refresh function', () => {
    const fn = vi.fn();
    store.subscribe(fn);
    store.getSnapshot().refresh();
    expect(fn).toHaveBeenCalled();
  });

  it('should call listener immediately on subscribe', () => {
    const fn = vi.fn();
    registry.register(makeManifest('mod.a'));
    store.subscribe(fn);
    expect(fn).toHaveBeenCalledWith(
      expect.objectContaining({
        entries: expect.arrayContaining([expect.any(Object)]),
      }),
    );
  });

  it('should unsubscribe', () => {
    const fn = vi.fn();
    const unsub = store.subscribe(fn);
    unsub();
    registry.register(makeManifest('mod.a'));
    bus.emit('module:registered', {});
    // Should not be called because unsubscribed
    expect(fn).toHaveBeenCalledTimes(1); // Only the initial call
  });

  it('should react to status changes', () => {
    registry.register(makeManifest('mod.a'));
    const stateBefore = store.getSnapshot();
    expect(stateBefore.activeModuleIds).toHaveLength(0);

    registry.setStatus('mod.a', 'active');
    bus.emit('module:statusChange', {});

    const stateAfter = store.getSnapshot();
    expect(stateAfter.activeModuleIds).toEqual(['mod.a']);
  });
});
