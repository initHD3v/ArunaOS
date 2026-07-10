import { describe, it, expect, vi } from 'vitest';
import { ModuleLifecycleManager } from '../lifecycle';

describe('ModuleLifecycleManager', () => {
  it('should register lifecycle hooks', () => {
    const mgr = new ModuleLifecycleManager();
    mgr.register('mod.a', {});
    expect(mgr.has('mod.a')).toBe(true);
  });

  it('should throw on duplicate registration', () => {
    const mgr = new ModuleLifecycleManager();
    mgr.register('mod.a', {});
    expect(() => mgr.register('mod.a', {})).toThrow('already registered');
  });

  it('should unregister hooks', () => {
    const mgr = new ModuleLifecycleManager();
    mgr.register('mod.a', {});
    mgr.unregister('mod.a');
    expect(mgr.has('mod.a')).toBe(false);
  });

  it('should be safe unregistering unknown module', () => {
    const mgr = new ModuleLifecycleManager();
    expect(() => mgr.unregister('unknown')).not.toThrow();
  });

  it('should call onInstall', async () => {
    const mgr = new ModuleLifecycleManager();
    const fn = vi.fn();
    mgr.register('mod.a', { onInstall: fn });
    await mgr.onInstall('mod.a');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should call onUninstall', async () => {
    const mgr = new ModuleLifecycleManager();
    const fn = vi.fn();
    mgr.register('mod.a', { onUninstall: fn });
    await mgr.onUninstall('mod.a');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should call onMount with params', async () => {
    const mgr = new ModuleLifecycleManager();
    const fn = vi.fn();
    mgr.register('mod.a', { onMount: fn });
    const params = { file: '/test' };
    await mgr.onMount('mod.a', params);
    expect(fn).toHaveBeenCalledWith(params);
  });

  it('should call onUnmount', async () => {
    const mgr = new ModuleLifecycleManager();
    const fn = vi.fn();
    mgr.register('mod.a', { onUnmount: fn });
    await mgr.onUnmount('mod.a');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should call onSleep', async () => {
    const mgr = new ModuleLifecycleManager();
    const fn = vi.fn();
    mgr.register('mod.a', { onSleep: fn });
    await mgr.onSleep('mod.a');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should call onResume', async () => {
    const mgr = new ModuleLifecycleManager();
    const fn = vi.fn();
    mgr.register('mod.a', { onResume: fn });
    await mgr.onResume('mod.a');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should call onThemeChange', () => {
    const mgr = new ModuleLifecycleManager();
    const fn = vi.fn();
    mgr.register('mod.a', { onThemeChange: fn });
    mgr.onThemeChange('mod.a', 'dark');
    expect(fn).toHaveBeenCalledWith('dark');
  });

  it('should call onSettingsChange', () => {
    const mgr = new ModuleLifecycleManager();
    const fn = vi.fn();
    mgr.register('mod.a', { onSettingsChange: fn });
    mgr.onSettingsChange('mod.a', 'theme', 'dark');
    expect(fn).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should be safe calling hooks for unregistered module', async () => {
    const mgr = new ModuleLifecycleManager();
    await expect(mgr.onMount('unknown')).resolves.toBeUndefined();
    await expect(mgr.onUnmount('unknown')).resolves.toBeUndefined();
    await expect(mgr.onSleep('unknown')).resolves.toBeUndefined();
    await expect(mgr.onResume('unknown')).resolves.toBeUndefined();
    expect(() => mgr.onThemeChange('unknown', 'dark')).not.toThrow();
    expect(() => mgr.onSettingsChange('unknown', 'k', 'v')).not.toThrow();
  });

  it('should handle absence of optional hooks', async () => {
    const mgr = new ModuleLifecycleManager();
    mgr.register('mod.a', {});
    await expect(mgr.onMount('mod.a')).resolves.toBeUndefined();
    await expect(mgr.onSleep('mod.a')).resolves.toBeUndefined();
  });
});
