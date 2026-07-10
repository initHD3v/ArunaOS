import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsService } from '../settings';
import type { EventBus, StorageService } from '../index';

function createMockStorage(): StorageService {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => (store.get(key) as string) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
    keys: vi.fn(async () => Array.from(store.keys()) as string[]),
    init: vi.fn(async () => {}),
  } as unknown as StorageService;
}

function createMockEventBus(): EventBus {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  return {
    emit: vi.fn((event: string, payload: unknown) => {
      listeners.get(event)?.forEach((h) => h(payload));
    }),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
      return () => listeners.get(event)?.delete(handler);
    }),
    once: vi.fn(),
    off: vi.fn(),
    onAny: vi.fn(),
    clear: vi.fn(),
    listenerCount: vi.fn(() => 0),
  } as unknown as EventBus;
}

describe('SettingsService', () => {
  let storage: StorageService;
  let bus: EventBus;
  let settings: SettingsService;

  beforeEach(() => {
    storage = createMockStorage();
    bus = createMockEventBus();
    settings = new SettingsService(storage, bus);
  });

  it('should return default values before init', () => {
    expect(settings.get('theme')).toBe('system');
    expect(settings.get('language')).toBe('en');
    expect(settings.get('dev').debugMode).toBe(false);
  });

  it('should load stored settings on init', async () => {
    await storage.set('arunaos_settings', { theme: 'dark' });
    await settings.init();
    expect(settings.get('theme')).toBe('dark');
  });

  it('should fallback to defaults for missing stored keys', async () => {
    await storage.set('arunaos_settings', { theme: 'dark' });
    await settings.init();
    expect(settings.get('language')).toBe('en');
  });

  it('should persist and emit on set', async () => {
    await settings.set('theme', 'dark');
    expect(storage.set).toHaveBeenCalled();
    expect(bus.emit).toHaveBeenCalledWith(
      'settings:updated',
      expect.objectContaining({
        key: 'theme',
        value: 'dark',
      }),
    );
  });

  it('should persist and emit on update', async () => {
    await settings.update({ theme: 'amoled', language: 'id' });
    expect(storage.set).toHaveBeenCalled();
    expect(bus.emit).toHaveBeenCalledTimes(2);
    expect(bus.emit).toHaveBeenNthCalledWith(
      1,
      'settings:updated',
      expect.objectContaining({
        key: 'theme',
        value: 'amoled',
      }),
    );
    expect(bus.emit).toHaveBeenNthCalledWith(
      2,
      'settings:updated',
      expect.objectContaining({
        key: 'language',
        value: 'id',
      }),
    );
  });

  it('should reset to defaults', async () => {
    await settings.set('theme', 'dark');
    await settings.reset();
    expect(settings.get('theme')).toBe('system');
  });

  it('should return all settings', () => {
    const all = settings.getAll();
    expect(all.theme).toBe('system');
    expect(all.version).toBe(2);
    expect(all.wallpaper.type).toBe('default');
  });

  it('should be ready after init', async () => {
    expect(settings.isReady()).toBe(false);
    await settings.init();
    expect(settings.isReady()).toBe(true);
  });

  it('should emit settings:loaded on init', async () => {
    await settings.init();
    expect(bus.emit).toHaveBeenCalledWith('settings:loaded', expect.any(Object));
  });

  it('should migrate old wallpaper format (v1 -> v2)', async () => {
    const oldSettings = {
      version: 1,
      theme: 'dark',
      wallpaper: { index: 2, blur: 0 },
    };
    await storage.set('arunaos_settings', oldSettings);
    await settings.init();
    const wallpaper = settings.get('wallpaper');
    expect(wallpaper.type).toBe('gradient');
    expect(wallpaper.gradientIndex).toBe(2);
    expect(settings.get('theme')).toBe('dark');
  });

  it('should migrate default wallpaper index to type default', async () => {
    const oldSettings = {
      version: 1,
      wallpaper: { index: 0, blur: 0 },
    };
    await storage.set('arunaos_settings', oldSettings);
    await settings.init();
    expect(settings.get('wallpaper').type).toBe('default');
  });

  it('should not re-run migration if version matches', async () => {
    const current = {
      version: 2,
      theme: 'dark',
      wallpaper: { type: 'gradient', gradientIndex: 1, imagePath: '', blur: 0 },
    };
    await storage.set('arunaos_settings', current);
    await settings.init();
    expect(settings.get('wallpaper').gradientIndex).toBe(1);
  });

  it('should emit on set with correct wallpaper config', async () => {
    await settings.set('wallpaper', {
      type: 'image',
      gradientIndex: 0,
      imagePath: 'data:...',
      blur: 0,
    });
    expect(bus.emit).toHaveBeenCalledWith(
      'settings:updated',
      expect.objectContaining({
        key: 'wallpaper',
        value: expect.objectContaining({ type: 'image' }),
      }),
    );
  });
});
