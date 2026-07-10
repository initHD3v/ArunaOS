import { describe, it, expect } from 'vitest';
import { ModuleRegistry } from '../registry';
import type { ModuleManifest, ModuleEntry } from '../types';

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

describe('ModuleRegistry', () => {
  it('should register a module', () => {
    const registry = new ModuleRegistry();
    const manifest = makeManifest();
    registry.register(manifest);
    expect(registry.get(manifest.id)).toBeTruthy();
    expect(registry.get(manifest.id)!.manifest.name).toBe('Test Module');
  });

  it('should throw on duplicate registration', () => {
    const registry = new ModuleRegistry();
    registry.register(makeManifest());
    expect(() => registry.register(makeManifest())).toThrow('already registered');
  });

  it('should return null for unknown module', () => {
    const registry = new ModuleRegistry();
    expect(registry.get('unknown')).toBeNull();
  });

  it('should return all registered modules', () => {
    const registry = new ModuleRegistry();
    registry.register(makeManifest({ id: 'mod.a', name: 'A' }));
    registry.register(makeManifest({ id: 'mod.b', name: 'B' }));
    expect(registry.getAll()).toHaveLength(2);
  });

  it('should search by name', () => {
    const registry = new ModuleRegistry();
    registry.register(makeManifest({ id: 'files', name: 'File Manager' }));
    registry.register(makeManifest({ id: 'settings', name: 'Settings' }));
    const results = registry.search('file');
    expect(results).toHaveLength(1);
    expect(results[0]!.manifest.id).toBe('files');
  });

  it('should search by id', () => {
    const registry = new ModuleRegistry();
    registry.register(makeManifest({ id: 'arunaos.files' }));
    registry.register(makeManifest({ id: 'arunaos.settings' }));
    const results = registry.search('arunaos.files');
    expect(results).toHaveLength(1);
  });

  it('should search by description', () => {
    const registry = new ModuleRegistry();
    registry.register(makeManifest({ description: 'System preferences' }));
    const results = registry.search('preferences');
    expect(results).toHaveLength(1);
  });

  it('should return empty array for no match', () => {
    const registry = new ModuleRegistry();
    registry.register(makeManifest());
    expect(registry.search('zzz')).toHaveLength(0);
  });

  it('should filter by type', () => {
    const registry = new ModuleRegistry();
    registry.register(makeManifest({ id: 'a', type: 'system' }));
    registry.register(makeManifest({ id: 'b', type: 'builtin' }));
    registry.register(makeManifest({ id: 'c', type: 'builtin' }));
    expect(registry.getByType('builtin')).toHaveLength(2);
    expect(registry.getByType('system')).toHaveLength(1);
  });

  it('should set and get status', () => {
    const registry = new ModuleRegistry();
    registry.register(makeManifest());
    registry.setStatus('test.mod', 'loading');
    expect(registry.getStatus('test.mod')).toBe('loading');
  });

  it('should set error on status', () => {
    const registry = new ModuleRegistry();
    registry.register(makeManifest());
    const err = new Error('fail');
    registry.setStatus('test.mod', 'error', err);
    expect(registry.get('test.mod')!.error).toBe(err);
  });

  it('should set instance', () => {
    const registry = new ModuleRegistry();
    registry.register(makeManifest());
    const instance = { foo: 'bar' };
    registry.setInstance('test.mod', instance);
    expect(registry.get('test.mod')!.instance).toBe(instance);
  });

  it('should unregister a module', () => {
    const registry = new ModuleRegistry();
    registry.register(makeManifest());
    registry.unregister('test.mod');
    expect(registry.get('test.mod')).toBeNull();
  });

  it('should throw on unregister unknown module', () => {
    const registry = new ModuleRegistry();
    expect(() => registry.unregister('unknown')).toThrow('not registered');
  });

  it('should fire onRegistered callback', () => {
    const registry = new ModuleRegistry();
    const calls: ModuleEntry[] = [];
    registry.onRegistered((e) => calls.push(e));
    registry.register(makeManifest());
    expect(calls).toHaveLength(1);
    expect(calls[0]!.manifest.id).toBe('test.mod');
  });

  it('should fire onUnregistered callback', () => {
    const registry = new ModuleRegistry();
    const calls: string[] = [];
    registry.onUnregistered((id) => calls.push(id));
    registry.register(makeManifest());
    registry.unregister('test.mod');
    expect(calls).toEqual(['test.mod']);
  });

  it('should fire onStatusChange callback', () => {
    const registry = new ModuleRegistry();
    const calls: Array<{ id: string; status: string }> = [];
    registry.onStatusChange((id, status) => calls.push({ id, status }));
    registry.register(makeManifest());
    registry.setStatus('test.mod', 'active');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.status).toBe('active');
  });

  it('should deduplicate callback on return', () => {
    const registry = new ModuleRegistry();
    const fn = () => {};
    const unsub = registry.onRegistered(fn);
    unsub();
    registry.register(makeManifest());
    expect(registry.getCount()).toBe(1);
  });

  it('should get service names', () => {
    const registry = new ModuleRegistry();
    registry.register(makeManifest({ id: 'a' }));
    registry.register(makeManifest({ id: 'b' }));
    expect(registry.getServiceNames()).toEqual(['a', 'b']);
  });

  it('should get count', () => {
    const registry = new ModuleRegistry();
    expect(registry.getCount()).toBe(0);
    registry.register(makeManifest());
    expect(registry.getCount()).toBe(1);
  });

  it('should be safe setting status for unknown module', () => {
    const registry = new ModuleRegistry();
    expect(() => registry.setStatus('unknown', 'active')).not.toThrow();
  });

  it('should be safe setting instance for unknown module', () => {
    const registry = new ModuleRegistry();
    expect(() => registry.setInstance('unknown', {})).not.toThrow();
  });

  it('should return null status for unknown module', () => {
    const registry = new ModuleRegistry();
    expect(registry.getStatus('unknown')).toBeNull();
  });
});
