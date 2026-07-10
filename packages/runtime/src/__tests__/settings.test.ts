import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModuleSettings } from '../settings';

interface EventHandler {
  (payload: unknown): void;
}

class MockEventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }
  emit(event: string, payload: unknown): void {
    this.handlers.get(event)?.forEach((h) => h(payload));
  }
}

class MockStorage {
  private data = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) ?? null;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }
}

describe('ModuleSettings', () => {
  let bus: MockEventBus;
  let storage: MockStorage;
  let moduleSettings: ModuleSettings;

  beforeEach(() => {
    bus = new MockEventBus();
    storage = new MockStorage();
    moduleSettings = new ModuleSettings(bus, storage);
  });

  it('should return undefined for unset key', async () => {
    const val = await moduleSettings.get('mod.a', 'theme');
    expect(val).toBeUndefined();
  });

  it('should set and get a value', async () => {
    await moduleSettings.set('mod.a', 'theme', 'dark');
    const val = await moduleSettings.get('mod.a', 'theme');
    expect(val).toBe('dark');
  });

  it('should persist to storage', async () => {
    await moduleSettings.set('mod.a', 'theme', 'dark');
    const raw = await storage.get('module:settings:mod.a');
    expect(raw).toEqual({ theme: 'dark' });
  });

  it('should get all settings for a module', async () => {
    await moduleSettings.set('mod.a', 'theme', 'dark');
    await moduleSettings.set('mod.a', 'lang', 'en');
    const all = await moduleSettings.getAll('mod.a');
    expect(all).toEqual({ theme: 'dark', lang: 'en' });
  });

  it('should delete a key', async () => {
    await moduleSettings.set('mod.a', 'theme', 'dark');
    await moduleSettings.delete('mod.a', 'theme');
    const val = await moduleSettings.get('mod.a', 'theme');
    expect(val).toBeUndefined();
  });

  it('should clear all settings for a module', async () => {
    await moduleSettings.set('mod.a', 'theme', 'dark');
    await moduleSettings.set('mod.a', 'lang', 'en');
    await moduleSettings.clear('mod.a');
    const all = await moduleSettings.getAll('mod.a');
    expect(all).toEqual({});
  });

  it('should not leak between modules', async () => {
    await moduleSettings.set('mod.a', 'theme', 'dark');
    await moduleSettings.set('mod.b', 'theme', 'light');
    expect(await moduleSettings.get('mod.a', 'theme')).toBe('dark');
    expect(await moduleSettings.get('mod.b', 'theme')).toBe('light');
  });

  it('should fire onChange handler', async () => {
    const handler = vi.fn();
    moduleSettings.onChange('mod.a', 'theme', handler);

    await moduleSettings.set('mod.a', 'theme', 'dark');
    expect(handler).toHaveBeenCalledWith('dark');
  });

  it('should not fire onChange for different key', async () => {
    const handler = vi.fn();
    moduleSettings.onChange('mod.a', 'theme', handler);

    await moduleSettings.set('mod.a', 'lang', 'en');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should unsubscribe onChange', async () => {
    const handler = vi.fn();
    const unsub = moduleSettings.onChange('mod.a', 'theme', handler);
    unsub();

    await moduleSettings.set('mod.a', 'theme', 'dark');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should cache values and not call storage on second get', async () => {
    const spy = vi.spyOn(storage, 'get');
    await moduleSettings.set('mod.a', 'theme', 'dark');

    // ensureCache is called during set, which calls storage.get (1 call)
    await moduleSettings.get('mod.a', 'theme'); // uses cache, no storage call
    await moduleSettings.get('mod.a', 'theme'); // uses cache, no storage call

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
