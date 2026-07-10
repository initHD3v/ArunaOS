import { describe, it, expect, vi } from 'vitest';
import { ModuleSandbox } from '../sandbox';
import type { ModuleManifest, SystemAPI } from '../types';

const makeManifest = (overrides: Partial<ModuleManifest> = {}): ModuleManifest => ({
  id: 'test.mod',
  name: 'Test Module',
  version: '1.0.0',
  description: 'A test module',
  icon: 'test',
  entry: './index',
  type: 'builtin',
  ...overrides,
});

const makeAPI = (): SystemAPI => ({
  openWindow: vi.fn().mockReturnValue('win_1'),
  closeWindow: vi.fn(),
  notify: vi.fn().mockReturnValue('notif_1'),
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
  settings: {
    get: vi.fn().mockReturnValue('dark'),
    set: vi.fn(),
  },
  theme: {
    getMode: vi.fn().mockReturnValue('dark'),
    setMode: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
});

describe('ModuleSandbox', () => {
  it('should create a sandbox with module id and name', () => {
    const sandbox = new ModuleSandbox();
    const manifest = makeManifest();
    const sb = sandbox.create(manifest, makeAPI());
    expect(sb.moduleId).toBe('test.mod');
    expect(sb.moduleName).toBe('Test Module');
  });

  it('should provide api object', () => {
    const sandbox = new ModuleSandbox();
    const sb = sandbox.create(makeManifest(), makeAPI());
    expect(sb.api).toBeDefined();
    expect(typeof (sb.api as SystemAPI).openWindow).toBe('function');
    expect(typeof (sb.api as SystemAPI).logger.info).toBe('function');
  });

  it('should limit storage API based on permissions', () => {
    const sandbox = new ModuleSandbox();
    // No storage permissions
    const manifest = makeManifest({ permissions: ['notification'] });
    const sb = sandbox.create(manifest, makeAPI());
    expect((sb.api as SystemAPI).storage).toBeUndefined();
  });

  it('should expose storage API with storage:read permission', () => {
    const sandbox = new ModuleSandbox();
    const manifest = makeManifest({ permissions: ['storage:read'] });
    const sb = sandbox.create(manifest, makeAPI());
    expect((sb.api as SystemAPI).storage).toBeDefined();
    expect(typeof (sb.api as SystemAPI).storage!.get).toBe('function');
  });

  it('should expose storage API with storage:write permission', () => {
    const sandbox = new ModuleSandbox();
    const manifest = makeManifest({ permissions: ['storage:write'] });
    const sb = sandbox.create(manifest, makeAPI());
    expect((sb.api as SystemAPI).storage).toBeDefined();
    expect(typeof (sb.api as SystemAPI).storage!.set).toBe('function');
  });

  it('should throw on storage:read if permission not granted', async () => {
    const sandbox = new ModuleSandbox();
    const manifest = makeManifest({ permissions: ['storage:write'] });
    const sb = sandbox.create(manifest, makeAPI());
    const storage = (sb.api as SystemAPI).storage!;
    await expect(storage.get('key')).rejects.toThrow('Permission denied: storage:read');
  });

  it('should throw on storage:write if permission not granted', async () => {
    const sandbox = new ModuleSandbox();
    const manifest = makeManifest({ permissions: ['storage:read'] });
    const sb = sandbox.create(manifest, makeAPI());
    const storage = (sb.api as SystemAPI).storage!;
    await expect(storage.set('key', 'val')).rejects.toThrow('Permission denied: storage:write');
    await expect(storage.delete('key')).rejects.toThrow('Permission denied: storage:write');
  });

  it('should delegate openWindow to system API', () => {
    const sandbox = new ModuleSandbox();
    const api = makeAPI();
    const sb = sandbox.create(makeManifest(), api);
    (sb.api as SystemAPI).openWindow({ title: 'Test' });
    expect(api.openWindow).toHaveBeenCalledWith({ title: 'Test' });
  });

  it('should delegate closeWindow to system API', () => {
    const sandbox = new ModuleSandbox();
    const api = makeAPI();
    const sb = sandbox.create(makeManifest(), api);
    (sb.api as SystemAPI).closeWindow('win_1');
    expect(api.closeWindow).toHaveBeenCalledWith('win_1');
  });

  it('should delegate notify to system API', () => {
    const sandbox = new ModuleSandbox();
    const api = makeAPI();
    const sb = sandbox.create(makeManifest(), api);
    (sb.api as SystemAPI).notify('info', 'Hello', { duration: 3000 });
    expect(api.notify).toHaveBeenCalledWith('info', 'Hello', { duration: 3000 });
  });

  it('should delegate settings to system API', () => {
    const sandbox = new ModuleSandbox();
    const api = makeAPI();
    const sb = sandbox.create(makeManifest(), api);
    const result = (sb.api as SystemAPI).settings.get('theme');
    expect(result).toBe('dark');
    (sb.api as SystemAPI).settings.set('theme', 'light');
    expect(api.settings.set).toHaveBeenCalledWith('theme', 'light');
  });

  it('should delegate theme to system API', () => {
    const sandbox = new ModuleSandbox();
    const api = makeAPI();
    const sb = sandbox.create(makeManifest(), api);
    const mode = (sb.api as SystemAPI).theme.getMode();
    expect(mode).toBe('dark');
    (sb.api as SystemAPI).theme.setMode('light');
    expect(api.theme.setMode).toHaveBeenCalledWith('light');
  });

  it('should delegate logger to system API', () => {
    const sandbox = new ModuleSandbox();
    const api = makeAPI();
    const sb = sandbox.create(makeManifest(), api);
    (sb.api as SystemAPI).logger.info('mod', 'msg', { key: 'val' });
    expect(api.logger.info).toHaveBeenCalledWith('mod', 'msg', { key: 'val' });
    (sb.api as SystemAPI).logger.warn('mod', 'warn msg');
    expect(api.logger.warn).toHaveBeenCalledWith('mod', 'warn msg', undefined);
    (sb.api as SystemAPI).logger.error('mod', 'err msg');
    expect(api.logger.error).toHaveBeenCalledWith('mod', 'err msg', undefined);
  });

  it('should return sandbox by module id', () => {
    const sandbox = new ModuleSandbox();
    sandbox.create(makeManifest({ id: 'mod.a' }), makeAPI());
    const sb = sandbox.get('mod.a');
    expect(sb).toBeTruthy();
    expect(sb!.moduleId).toBe('mod.a');
  });

  it('should return null for unknown module', () => {
    const sandbox = new ModuleSandbox();
    expect(sandbox.get('unknown')).toBeNull();
  });

  it('should destroy sandbox', () => {
    const sandbox = new ModuleSandbox();
    sandbox.create(makeManifest(), makeAPI());
    sandbox.destroy('test.mod');
    expect(sandbox.get('test.mod')).toBeNull();
  });
});
