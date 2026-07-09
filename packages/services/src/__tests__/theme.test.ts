import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeService } from '../theme';
import { SettingsService } from '../settings';
import type { EventBus, StorageService } from '../index';

function createMockStorage(): StorageService {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => (store.get(key) as string) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    delete: vi.fn(async () => {}),
    clear: vi.fn(async () => {}),
    keys: vi.fn(async () => []),
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

describe('ThemeService', () => {
  let storage: StorageService;
  let bus: EventBus;
  let settings: SettingsService;
  let theme: ThemeService;

  beforeEach(async () => {
    storage = createMockStorage();
    bus = createMockEventBus();
    settings = new SettingsService(storage, bus);
    await settings.init();
    theme = new ThemeService(settings, bus);
  });

  it('should start with system mode', () => {
    expect(theme.getMode()).toBe('system');
  });

  it('should update mode via setMode', async () => {
    await theme.setMode('dark');
    expect(theme.getMode()).toBe('dark');
  });

  it('should emit theme:changed on setMode', async () => {
    await theme.setMode('dark');
    expect(bus.emit).toHaveBeenCalledWith('theme:changed', { mode: 'dark' });
  });

  it('should toggle through modes', async () => {
    expect(await theme.toggle()).toBe('amoled');
    expect(await theme.toggle()).toBe('high-contrast');
    expect(await theme.toggle()).toBe('light');
    expect(await theme.toggle()).toBe('dark');
    expect(await theme.toggle()).toBe('system');
  });

  it('should listen to settings:updated theme changes', () => {
    theme.init();
    expect(bus.on).toHaveBeenCalledWith('settings:updated', expect.any(Function));
  });

  it('should persist mode to settings', async () => {
    const spy = vi.spyOn(settings, 'set');
    await theme.setMode('dark');
    expect(spy).toHaveBeenCalledWith('theme', 'dark');
  });
});
