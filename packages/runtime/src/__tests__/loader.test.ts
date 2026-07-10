import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModuleRegistry } from '../registry';
import { ModuleLifecycleManager } from '../lifecycle';
import { ModuleSandbox } from '../sandbox';
import { ModuleLoader } from '../loader';
import { ModulePermissions } from '../permissions';
import { ModuleIPC } from '../ipc';
import type { ModuleManifest, SystemAPI } from '../types';

class MockEventBus {
  private handlers = new Map<string, Set<(payload: unknown) => void>>();
  on(event: string, handler: (payload: unknown) => void): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }
  off(event: string, handler: (payload: unknown) => void): void {
    this.handlers.get(event)?.delete(handler);
  }
  emit(event: string, payload: unknown): void {
    this.handlers.get(event)?.forEach((h) => h(payload));
  }
  clear(): void {
    this.handlers.clear();
  }
}

const makeManifest = (id = 'test.mod'): ModuleManifest => ({
  id,
  name: 'Test',
  version: '1.0.0',
  description: 'Test module',
  icon: 'test',
  entry: './index',
  type: 'builtin',
  permissions: ['notification'],
});

const makeSystemAPI = (): SystemAPI => ({
  openWindow: vi.fn(),
  closeWindow: vi.fn(),
  notify: vi.fn(),
  storage: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  settings: { get: vi.fn(), set: vi.fn() },
  theme: { getMode: vi.fn(), setMode: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
});

describe('ModuleLoader', () => {
  let registry: ModuleRegistry;
  let lifecycle: ModuleLifecycleManager;
  let sandbox: ModuleSandbox;
  let ipc: ModuleIPC;
  let permissions: ModulePermissions;
  let loader: ModuleLoader;
  let eventBus: MockEventBus;
  let systemAPI: SystemAPI;

  beforeEach(() => {
    registry = new ModuleRegistry();
    lifecycle = new ModuleLifecycleManager();
    sandbox = new ModuleSandbox();
    eventBus = new MockEventBus();
    ipc = new ModuleIPC(eventBus);
    permissions = new ModulePermissions();
    loader = new ModuleLoader(registry, lifecycle, sandbox, ipc, permissions);
    systemAPI = makeSystemAPI();
    loader.setSystemAPI(systemAPI);
  });

  it('should load a module with factory', async () => {
    registry.register(makeManifest());
    loader.registerFactory('test.mod', async () => ({ exposed: 'fn' }));
    const instance = await loader.load('test.mod');
    expect(instance.exposed).toBe('fn');
    expect(instance.__sandbox).toBeDefined();
    expect(registry.getStatus('test.mod')).toBe('active');
    expect(loader.isLoaded('test.mod')).toBe(true);
  });

  it('should load a module without factory', async () => {
    registry.register(makeManifest());
    const instance = await loader.load('test.mod');
    expect(instance.__sandbox).toBeDefined();
    expect(registry.getStatus('test.mod')).toBe('active');
  });

  it('should throw if module is not registered', async () => {
    await expect(loader.load('unknown')).rejects.toThrow('not registered');
  });

  it('should return existing instance if already loaded', async () => {
    registry.register(makeManifest());
    loader.registerFactory('test.mod', async () => ({ data: 'first' }));
    const instance1 = await loader.load('test.mod');
    const instance2 = await loader.load('test.mod');
    expect(instance2).toBe(instance1);
  });

  it('should unload a module', async () => {
    registry.register(makeManifest());
    await loader.load('test.mod');
    await loader.unload('test.mod');
    expect(loader.isLoaded('test.mod')).toBe(false);
    expect(registry.getStatus('test.mod')).toBe('registered');
  });

  it('should reload a module', async () => {
    registry.register(makeManifest());
    let counter = 0;
    loader.registerFactory('test.mod', async () => ({ count: ++counter }));
    const instance1 = await loader.load('test.mod');
    expect(instance1.count).toBe(1);

    const instance2 = await loader.reload('test.mod');
    expect(instance2.count).toBe(2);
    expect(loader.isLoaded('test.mod')).toBe(true);
  });

  it('should throw if factory is already registered', () => {
    loader.registerFactory('test.mod', async () => ({}));
    expect(() => loader.registerFactory('test.mod', async () => ({}))).toThrow(
      'already registered',
    );
  });

  it('should throw on factory error', async () => {
    registry.register(makeManifest());
    loader.registerFactory('test.mod', async () => {
      throw new Error('factory error');
    });
    await expect(loader.load('test.mod')).rejects.toThrow('factory error');
    expect(registry.getStatus('test.mod')).toBe('error');
  });

  it('should suspend and resume a module', async () => {
    registry.register(makeManifest());
    await loader.load('test.mod');
    await loader.sleep('test.mod');
    expect(registry.getStatus('test.mod')).toBe('suspended');
    await loader.resume('test.mod');
    expect(registry.getStatus('test.mod')).toBe('active');
  });

  it('should list loaded modules', async () => {
    registry.register(makeManifest('mod.a'));
    registry.register(makeManifest('mod.b'));
    await loader.load('mod.a');
    expect(loader.getLoadedModules()).toEqual(['mod.a']);
    await loader.load('mod.b');
    expect(loader.getLoadedModules()).toEqual(['mod.a', 'mod.b']);
    await loader.unload('mod.a');
    expect(loader.getLoadedModules()).toEqual(['mod.b']);
  });

  it('should not fail sleep/resume for unloaded module', async () => {
    registry.register(makeManifest());
    await expect(loader.sleep('test.mod')).resolves.toBeUndefined();
    await expect(loader.resume('test.mod')).resolves.toBeUndefined();
  });

  it('should auto-grant permissions for built-in on load', async () => {
    registry.register(makeManifest('arunaos.files'));
    await loader.load('arunaos.files');
    expect(permissions.has('arunaos.files', 'storage:read')).toBe(true);
  });
});
