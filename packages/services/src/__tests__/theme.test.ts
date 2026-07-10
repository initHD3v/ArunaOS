import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeService } from '../theme';
import { SettingsService } from '../settings';
import type { EventBus, StorageService } from '../index';

// Polyfill window.matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

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

  it('should ignore duplicate setMode call', async () => {
    await theme.setMode('dark');
    const themeChangedCalls = (bus.emit as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => c[0] === 'theme:changed',
    );
    expect(themeChangedCalls).toHaveLength(1);
    await theme.setMode('dark');
    const themeChangedCalls2 = (bus.emit as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => c[0] === 'theme:changed',
    );
    // Should NOT emit theme:changed again because mode hasn't changed
    expect(themeChangedCalls2).toHaveLength(1);
  });

  it('should emit theme:changed on setMode', async () => {
    await theme.setMode('dark');
    expect(bus.emit).toHaveBeenCalledWith('theme:changed', { mode: 'dark' });
  });

  it('should persist mode to settings', async () => {
    const spy = vi.spyOn(settings, 'set');
    await theme.setMode('dark');
    expect(spy).toHaveBeenCalledWith('theme', 'dark');
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

  it('should re-apply theme when settings:updated with theme key', async () => {
    theme.init();
    // Simulate settings:updated event for theme
    const handler = (bus.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: unknown[]) => call[0] === 'settings:updated',
    )?.[1];
    expect(handler).toBeDefined();

    // Change stored settings value
    await settings.set('theme', 'amoled');
    // Call handler to simulate the event
    handler({ key: 'theme' });

    expect(theme.getMode()).toBe('amoled');
  });

  it('should not change mode when init called without stored theme', () => {
    settings = new SettingsService(storage, bus);
    // Don't call init on settings, so theme stays as 'system' default
    const t = new ThemeService(settings, bus);
    t.init();
    expect(t.getMode()).toBe('system');
  });

  it('should apply dark class to document on dark mode', async () => {
    await theme.setMode('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('should apply light class on light mode', async () => {
    await theme.setMode('dark');
    await theme.setMode('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('should add theme-amoled class for amoled mode', async () => {
    await theme.setMode('amoled');
    expect(document.documentElement.classList.contains('theme-amoled')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should add theme-high-contrast class for high-contrast mode', async () => {
    await theme.setMode('high-contrast');
    expect(document.documentElement.classList.contains('theme-high-contrast')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('should remove theme classes when switching modes', async () => {
    await theme.setMode('amoled');
    expect(document.documentElement.classList.contains('theme-amoled')).toBe(true);
    await theme.setMode('light');
    expect(document.documentElement.classList.contains('theme-amoled')).toBe(false);
    expect(document.documentElement.classList.contains('theme-high-contrast')).toBe(false);
  });
});
